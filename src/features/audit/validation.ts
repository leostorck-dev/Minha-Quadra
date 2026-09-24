import { ValidationError } from "../../lib/api/validation-error.ts";

export type AuditType = "all" | "customer" | "reservation" | "payment";
export type AuditFilters = { type: AuditType; page: number };

export function parseAuditFilters(params: URLSearchParams): AuditFilters {
  const type = params.get("type") ?? "all";
  if (!["all", "customer", "reservation", "payment"].includes(type)) {
    throw new ValidationError("Filtro de auditoria inválido.");
  }
  const pageText = params.get("page") ?? "1";
  if (!/^[1-9]\d{0,2}$/.test(pageText)) {
    throw new ValidationError("Página inválida.");
  }
  return { type: type as AuditType, page: Number(pageText) };
}
