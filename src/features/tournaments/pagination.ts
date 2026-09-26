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

// Keyset pages avoid the API row cap and oversized lists of IDs in URLs.
export async function collectById<T extends { id: string }>(
  read: (
    after: string | null,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  message: string,
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | null = null;
  for (;;) {
    const result = await read(after);
    if (result.error || !result.data) throw new Error(message);
    if (!result.data.length) return rows;
    const next = result.data.at(-1)!.id;
    if (after !== null && next <= after) throw new Error(message);
    rows.push(...result.data);
    after = next;
  }
}
