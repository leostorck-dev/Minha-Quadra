import type { AuthContext } from "@/lib/auth/context";
import { ValidationError } from "@/lib/api/validation-error";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { getReservation } from "@/features/reservations/service";
import type { PaymentMethod } from "./validation";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type EventRow = Database["public"]["Tables"]["payment_events"]["Row"];

export type Payment = {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  status: "paid" | "refunded";
  createdAt: string;
  refundedAt: string | null;
};

export type PaymentEvent = {
  id: string;
  event: "paid" | "refunded";
  actorId: string;
  createdAt: string;
};

export class PaymentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConflictError";
  }
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    amount: row.amount,
    method: row.method as PaymentMethod,
    status: row.status as Payment["status"],
    createdAt: row.created_at,
    refundedAt: row.refunded_at,
  };
}

function toEvent(row: EventRow): PaymentEvent {
  return {
    id: row.id,
    event: row.event as PaymentEvent["event"],
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

export async function getPaymentDetails(
  context: AuthContext,
  reservationId: string,
) {
  const reservation = await getReservation(context, reservationId);
  if (reservation.kind !== "booking") {
    throw new ValidationError("Bloqueio de horário não possui cobrança.");
  }
  const supabase = await createClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("reservation_id", reservationId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o pagamento.");

  let events: PaymentEvent[] = [];
  if (payment) {
    const { data, error: eventsError } = await supabase
      .from("payment_events")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .eq("payment_id", payment.id)
      .order("created_at", { ascending: true });
    if (eventsError) throw new Error("Não foi possível carregar o histórico.");
    events = (data ?? []).map(toEvent);
  }

  const situation = payment
    ? payment.status
    : reservation.status === "cancelled"
      ? "cancelled"
      : reservation.price === 0
        ? "free"
        : "pending";
  return {
    payment: payment ? toPayment(payment) : null,
    events,
    situation,
    amount: reservation.price,
  };
}

export async function registerPayment(
  context: AuthContext,
  reservationId: string,
  method: PaymentMethod,
) {
  const reservation = await getReservation(context, reservationId);
  if (
    reservation.kind !== "booking" ||
    reservation.price <= 0 ||
    ["cancelled", "no_show"].includes(reservation.status)
  ) {
    throw new PaymentConflictError("Esta reserva não aceita pagamento.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      tenant_id: context.tenantId,
      reservation_id: reservationId,
      method,
    })
    .select("*")
    .single();
  if (error?.code === "23505") {
    throw new PaymentConflictError("Esta reserva já possui pagamento.");
  }
  if (error?.code === "23514" || error?.code === "23503") {
    throw new PaymentConflictError("Esta reserva não aceita pagamento.");
  }
  if (error || !data)
    throw new Error("Não foi possível registrar o pagamento.");
  return toPayment(data);
}

export async function refundPayment(
  context: AuthContext,
  reservationId: string,
) {
  const details = await getPaymentDetails(context, reservationId);
  if (!details.payment || details.payment.status !== "paid") {
    throw new PaymentConflictError("Não há pagamento para estornar.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "refunded" })
    .eq("tenant_id", context.tenantId)
    .eq("reservation_id", reservationId)
    .eq("status", "paid")
    .select("*")
    .maybeSingle();
  if (error?.code === "23514" || !data) {
    throw new PaymentConflictError("Este pagamento já foi estornado.");
  }
  if (error) throw new Error("Não foi possível registrar o estorno.");
  return toPayment(data);
}
