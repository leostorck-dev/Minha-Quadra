import { ValidationError } from "../../lib/api/validation-error.ts";
import { Temporal } from "@js-temporal/polyfill";

export type AuditType = "all" | "customer" | "reservation" | "payment";
export type AuditFilters = {
  type: AuditType;
  page: number;
  from: string | null;
  to: string | null;
};

function parseLocalDate(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ValidationError("Data da auditoria inválida.");
  try {
    return Temporal.PlainDate.from(value, { overflow: "reject" }).toString();
  } catch {
    throw new ValidationError("Data da auditoria inválida.");
  }
}

export function auditDateWindow(
  filters: Pick<AuditFilters, "from" | "to">,
  timezone: string,
) {
  const start = filters.from
    ? Temporal.PlainDate.from(filters.from)
        .toPlainDateTime("00:00")
        .toZonedDateTime(timezone)
        .toInstant()
        .toString()
    : null;
  const end = filters.to
    ? Temporal.PlainDate.from(filters.to)
        .add({ days: 1 })
        .toPlainDateTime("00:00")
        .toZonedDateTime(timezone)
        .toInstant()
        .toString()
    : null;
  return { start, end };
}

export function parseAuditFilters(params: URLSearchParams): AuditFilters {
  const type = params.get("type") ?? "all";
  if (!["all", "customer", "reservation", "payment"].includes(type)) {
    throw new ValidationError("Filtro de auditoria inválido.");
  }
  const pageText = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,2}$/.test(pageText)) {
    throw new ValidationError("Página inválida.");
  }
  const from = parseLocalDate(params.get("from"));
  const to = parseLocalDate(params.get("to"));
  if (from && to && from > to)
    throw new ValidationError(
      "Data inicial deve ser anterior ou igual à final.",
    );
  return { type: type as AuditType, page: Number(pageText), from, to };
}
