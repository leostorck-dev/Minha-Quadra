import { ValidationError } from "../../lib/api/validation-error.ts";
import { uuid } from "./validation.ts";

export function parseTournamentSearch(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim();
  const page = Number(params.get("page") ?? "1");
  const status = params.get("status") ?? "all";
  const selectedId = params.get("selectedId");
  if (query.length > 80 || !Number.isInteger(page) || page < 1 || page > 10000)
    throw new ValidationError("Busca ou página inválida.");
  if (!["all", "draft", "open", "closed"].includes(status))
    throw new ValidationError("Situação inválida.");
  return {
    query,
    page,
    status,
    selectedId: selectedId ? uuid(selectedId) : null,
  };
}

export function literalSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export { collectById } from "../../lib/database/pagination.ts";
