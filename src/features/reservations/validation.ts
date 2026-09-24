import { Temporal } from "@js-temporal/polyfill";
import { ValidationError } from "../../lib/api/validation-error.ts";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";
export type ReservationKind = "booking" | "block";
export type ReservationCreate = {
  kind: ReservationKind;
  courtId: string;
  customerId: string | null;
  startAt: string;
  endAt: string;
  notes: string | null;
};
export type ReservationUpdate = Partial<Omit<ReservationCreate, "kind">> & {
  status?: ReservationStatus;
};

const statuses: ReservationStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
];
const createKeys = new Set([
  "kind",
  "courtId",
  "customerId",
  "startAt",
  "endAt",
  "notes",
]);
const updateKeys = new Set([
  "courtId",
  "customerId",
  "startAt",
  "endAt",
  "notes",
  "status",
]);

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Envie um objeto JSON válido.");
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: Set<string>) {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ValidationError("O payload contém campos não permitidos.");
  }
}

export function parseUuid(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ValidationError(`${label} inválido.`);
  }
  return value;
}

function nullableUuid(value: unknown, label: string) {
  return value === null ? null : parseUuid(value, label);
}

export function parseInstant(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    throw new ValidationError(`${label} deve ser ISO 8601 com fuso.`);
  }
  try {
    return Temporal.Instant.from(value).toString();
  } catch {
    throw new ValidationError(`${label} inválido.`);
  }
}

function notes(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) {
    throw new ValidationError("Observações devem ter até 2000 caracteres.");
  }
  return value.trim() || null;
}

export function assertRange(startAt: string, endAt: string) {
  const minutes = Number(
    Temporal.Instant.from(endAt)
      .since(Temporal.Instant.from(startAt))
      .total("minutes"),
  );
  if (minutes < 30 || minutes > 720 || minutes % 30 !== 0) {
    throw new ValidationError(
      "A reserva deve durar de 30 minutos a 12 horas, em intervalos de 30 minutos.",
    );
  }
}

export function assertLocalHours(
  startAt: string,
  endAt: string,
  timezone: string,
  openingTime: string,
  closingTime: string,
) {
  const start = Temporal.Instant.from(startAt).toZonedDateTimeISO(timezone);
  const end = Temporal.Instant.from(endAt).toZonedDateTimeISO(timezone);
  const startTime = `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
  const endTime = `${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`;
  if (
    start.toPlainDate().toString() !== end.toPlainDate().toString() ||
    start.minute % 30 !== 0 ||
    end.minute % 30 !== 0 ||
    start.second !== 0 ||
    end.second !== 0 ||
    startTime < openingTime ||
    endTime > closingTime
  ) {
    throw new ValidationError("Horário fora do funcionamento da quadra.");
  }
}

export function assertStatusTransition(
  current: ReservationStatus,
  next: ReservationStatus,
  kind: ReservationKind,
) {
  if (current === next) return;
  const allowed: Partial<Record<ReservationStatus, ReservationStatus[]>> =
    kind === "block"
      ? { confirmed: ["cancelled"] }
      : {
          pending: ["confirmed", "cancelled"],
          confirmed: ["checked_in", "cancelled", "no_show"],
          checked_in: ["completed"],
        };
  if (!allowed[current]?.includes(next))
    throw new ValidationError("Transição de status inválida.");
}

export function parseReservationCreate(value: unknown): ReservationCreate {
  const input = record(value);
  keys(input, createKeys);
  if (input.kind !== "booking" && input.kind !== "block")
    throw new ValidationError("Tipo de reserva inválido.");
  const customerId =
    input.kind === "booking"
      ? parseUuid(input.customerId, "Cliente")
      : nullableUuid(input.customerId ?? null, "Cliente");
  if (input.kind === "block" && customerId !== null)
    throw new ValidationError("Bloqueio não possui cliente.");
  const startAt = parseInstant(input.startAt, "Início");
  const endAt = parseInstant(input.endAt, "Término");
  assertRange(startAt, endAt);
  return {
    kind: input.kind,
    courtId: parseUuid(input.courtId, "Quadra"),
    customerId,
    startAt,
    endAt,
    notes: notes(input.notes ?? null),
  };
}

export function parseReservationUpdate(value: unknown): ReservationUpdate {
  const input = record(value);
  keys(input, updateKeys);
  if (!Object.keys(input).length)
    throw new ValidationError("Informe ao menos um campo para atualizar.");
  const output: ReservationUpdate = {};
  if ("courtId" in input) output.courtId = parseUuid(input.courtId, "Quadra");
  if ("customerId" in input)
    output.customerId = nullableUuid(input.customerId, "Cliente");
  if ("startAt" in input)
    output.startAt = parseInstant(input.startAt, "Início");
  if ("endAt" in input) output.endAt = parseInstant(input.endAt, "Término");
  if ("notes" in input) output.notes = notes(input.notes);
  if ("status" in input) {
    if (!statuses.includes(input.status as ReservationStatus))
      throw new ValidationError("Status inválido.");
    output.status = input.status as ReservationStatus;
  }
  if (output.startAt && output.endAt) assertRange(output.startAt, output.endAt);
  return output;
}

export function parseReservationList(params: URLSearchParams) {
  const from = parseInstant(params.get("from"), "Início do período");
  const to = parseInstant(params.get("to"), "Fim do período");
  const hours = Number(
    Temporal.Instant.from(to).since(Temporal.Instant.from(from)).total("hours"),
  );
  if (hours <= 0 || hours > 24 * 8)
    throw new ValidationError("O período deve ter até oito dias.");
  const courtId = params.get("courtId");
  const status = params.get("status");
  if (
    status &&
    status !== "all" &&
    !statuses.includes(status as ReservationStatus)
  )
    throw new ValidationError("Filtro de status inválido.");
  return {
    from,
    to,
    courtId: courtId ? parseUuid(courtId, "Quadra") : null,
    status: (status ?? "all") as ReservationStatus | "all",
  };
}

export function parseAvailability(params: URLSearchParams) {
  const courtId = parseUuid(params.get("courtId"), "Quadra");
  const date = params.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new ValidationError("Data inválida.");
  try {
    Temporal.PlainDate.from(date, { overflow: "reject" });
  } catch {
    throw new ValidationError("Data inválida.");
  }
  return { courtId, date };
}
