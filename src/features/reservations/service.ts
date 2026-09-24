import { Temporal } from "@js-temporal/polyfill";
import type { AuthContext } from "@/lib/auth/context";
import { ValidationError } from "@/lib/api/validation-error";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { getCourt } from "@/features/courts/service";
import { getCustomer } from "@/features/customers/service";
import { overlaps } from "./conflicts";
import {
  assertLocalHours,
  assertRange,
  assertStatusTransition,
  type ReservationCreate,
  type ReservationKind,
  type ReservationStatus,
  type ReservationUpdate,
} from "./validation";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type Joined = ReservationRow & {
  courts: { name: string } | null;
  customers: { name: string } | null;
};
const detailSelect = "*, courts(name), customers(name)";
const activeStatuses: ReservationStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
];

export type Reservation = {
  id: string;
  courtId: string;
  courtName: string;
  customerId: string | null;
  customerName: string | null;
  kind: ReservationKind;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  price: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  paymentSituation?: "pending" | "paid" | "refunded" | "cancelled" | "free";
};

export class ReservationNotFoundError extends Error {
  constructor() {
    super("Reserva não encontrada.");
    this.name = "ReservationNotFoundError";
  }
}

export class ReservationConflictError extends Error {
  constructor() {
    super("Já existe uma reserva ou bloqueio neste horário.");
    this.name = "ReservationConflictError";
  }
}

function toReservation(row: Joined): Reservation {
  return {
    id: row.id,
    courtId: row.court_id,
    courtName: row.courts?.name ?? "Quadra",
    customerId: row.customer_id,
    customerName: row.customers?.name ?? null,
    kind: row.kind as ReservationKind,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    price: row.price,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWriteError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): never {
  if (error?.code === "23P01") throw new ReservationConflictError();
  if (error?.code === "23514" && error.message?.includes("pagamento")) {
    throw new ValidationError(
      "Reserva com pagamento não pode ter horário ou preço alterado.",
    );
  }
  if (error?.code === "23514" || error?.code === "23503") {
    throw new ValidationError(
      "Dados da reserva inválidos para esta arena ou horário.",
    );
  }
  throw new Error(fallback);
}

export async function getArenaTimezone(context: AuthContext) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("timezone")
    .eq("id", context.tenantId)
    .single();
  if (error || !data)
    throw new Error("Não foi possível carregar o fuso da arena.");
  return data.timezone;
}

async function assertSchedule(
  context: AuthContext,
  courtId: string,
  customerId: string | null,
  kind: ReservationKind,
  startAt: string,
  endAt: string,
) {
  assertRange(startAt, endAt);
  const [court, timezone] = await Promise.all([
    getCourt(context, courtId),
    getArenaTimezone(context),
  ]);
  if (court.status !== "available")
    throw new ValidationError("Quadra indisponível.");
  assertLocalHours(
    startAt,
    endAt,
    timezone,
    court.openingTime,
    court.closingTime,
  );
  if (kind === "booking") {
    if (!customerId) throw new ValidationError("Selecione um cliente.");
    const customer = await getCustomer(context, customerId);
    if (customer.status !== "active")
      throw new ValidationError("Cliente inativo.");
  } else if (customerId !== null) {
    throw new ValidationError("Bloqueio não possui cliente.");
  }
}

export async function listReservations(
  context: AuthContext,
  options: {
    from: string;
    to: string;
    courtId: string | null;
    status: ReservationStatus | "all";
  },
) {
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select(detailSelect)
    .eq("tenant_id", context.tenantId)
    .lt("start_at", options.to)
    .gt("end_at", options.from);
  if (options.courtId) query = query.eq("court_id", options.courtId);
  if (options.status !== "all") query = query.eq("status", options.status);
  const { data, error } = await query.order("start_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar a agenda.");
  const items = ((data ?? []) as Joined[]).map(toReservation);
  if (context.role !== "COACH") {
    const bookingIds = items
      .filter((item) => item.kind === "booking")
      .map((item) => item.id);
    if (bookingIds.length > 0) {
      const { data: payments, error: paymentError } = await supabase
        .from("payments")
        .select("reservation_id, status")
        .eq("tenant_id", context.tenantId)
        .in("reservation_id", bookingIds);
      if (paymentError)
        throw new Error("Não foi possível carregar as cobranças.");
      const statusByReservation = new Map(
        (payments ?? []).map((payment) => [
          payment.reservation_id,
          payment.status as "paid" | "refunded",
        ]),
      );
      for (const item of items) {
        if (item.kind !== "booking") continue;
        item.paymentSituation =
          statusByReservation.get(item.id) ??
          (item.status === "cancelled"
            ? "cancelled"
            : item.price === 0
              ? "free"
              : "pending");
      }
    }
  }
  return { items };
}

export async function getReservation(context: AuthContext, id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new ReservationNotFoundError();
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(detailSelect)
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a reserva.");
  if (!data) throw new ReservationNotFoundError();
  return toReservation(data as Joined);
}

export async function createReservation(
  context: AuthContext,
  input: ReservationCreate,
) {
  await assertSchedule(
    context,
    input.courtId,
    input.customerId,
    input.kind,
    input.startAt,
    input.endAt,
  );
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      tenant_id: context.tenantId,
      court_id: input.courtId,
      customer_id: input.customerId,
      kind: input.kind,
      start_at: input.startAt,
      end_at: input.endAt,
      notes: input.notes,
    })
    .select(detailSelect)
    .single();
  if (error) mapWriteError(error, "Não foi possível criar a reserva.");
  return toReservation(data as Joined);
}

export async function updateReservation(
  context: AuthContext,
  id: string,
  input: ReservationUpdate,
) {
  const existing = await getReservation(context, id);
  if (input.status)
    assertStatusTransition(existing.status, input.status, existing.kind);
  const scheduling =
    "courtId" in input ||
    "customerId" in input ||
    "startAt" in input ||
    "endAt" in input;
  if (scheduling && !["pending", "confirmed"].includes(existing.status)) {
    throw new ValidationError(
      "Esta reserva não pode mais ter o horário alterado.",
    );
  }
  if ("notes" in input && !["pending", "confirmed"].includes(existing.status)) {
    throw new ValidationError("Esta reserva não pode mais ser editada.");
  }
  const courtId = input.courtId ?? existing.courtId;
  const customerId =
    "customerId" in input ? (input.customerId ?? null) : existing.customerId;
  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  if (scheduling)
    await assertSchedule(
      context,
      courtId,
      customerId,
      existing.kind,
      startAt,
      endAt,
    );

  const updates: Database["public"]["Tables"]["reservations"]["Update"] = {};
  if ("courtId" in input) updates.court_id = input.courtId;
  if ("customerId" in input) updates.customer_id = input.customerId;
  if ("startAt" in input) updates.start_at = input.startAt;
  if ("endAt" in input) updates.end_at = input.endAt;
  if ("notes" in input) updates.notes = input.notes;
  if ("status" in input) updates.status = input.status;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .update(updates)
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select(detailSelect)
    .maybeSingle();
  if (error) mapWriteError(error, "Não foi possível atualizar a reserva.");
  if (!data) throw new ReservationNotFoundError();
  return toReservation(data as Joined);
}

export async function cancelReservation(context: AuthContext, id: string) {
  const existing = await getReservation(context, id);
  assertStatusTransition(existing.status, "cancelled", existing.kind);
  await updateReservation(context, id, { status: "cancelled" });
}

export async function getAvailability(
  context: AuthContext,
  courtId: string,
  date: string,
) {
  const [court, timezone] = await Promise.all([
    getCourt(context, courtId),
    getArenaTimezone(context),
  ]);
  const dayStart = Temporal.PlainDate.from(date)
    .toPlainDateTime("00:00")
    .toZonedDateTime(timezone)
    .toInstant();
  const dayEnd = Temporal.PlainDate.from(date)
    .add({ days: 1 })
    .toPlainDateTime("00:00")
    .toZonedDateTime(timezone)
    .toInstant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("start_at, end_at")
    .eq("tenant_id", context.tenantId)
    .eq("court_id", courtId)
    .in("status", activeStatuses)
    .lt("start_at", dayEnd.toString())
    .gt("end_at", dayStart.toString());
  if (error) throw new Error("Não foi possível consultar a disponibilidade.");

  const slots: { startAt: string; endAt: string; available: boolean }[] = [];
  let current = Temporal.PlainDateTime.from(`${date}T${court.openingTime}`);
  const close = Temporal.PlainDateTime.from(`${date}T${court.closingTime}`);
  while (
    Temporal.PlainDateTime.compare(current.add({ minutes: 30 }), close) <= 0
  ) {
    const next = current.add({ minutes: 30 });
    const startAt = current.toZonedDateTime(timezone).toInstant().toString();
    const endAt = next.toZonedDateTime(timezone).toInstant().toString();
    slots.push({
      startAt,
      endAt,
      available:
        court.status === "available" &&
        !(data ?? []).some((row) =>
          overlaps(row.start_at, row.end_at, startAt, endAt),
        ),
    });
    current = next;
  }
  return { courtId, date, timezone, slots };
}
