import { ValidationError } from "../../lib/api/validation-error.ts";

export const TOURNAMENT_CATEGORIES = [
  "Iniciante",
  "C",
  "B",
  "A",
  "Open",
  "Mista",
] as const;
export type TournamentCategoryName = (typeof TOURNAMENT_CATEGORIES)[number];

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new ValidationError("Dados do torneio inválidos.");
  }
  return value as Record<string, unknown>;
}

export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ValidationError("Identificador inválido.");
  }
  return value;
}

function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Informe uma data válida.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ValidationError("Informe uma data válida.");
  }
  return value;
}

export function parseTournament(value: unknown) {
  const data = record(value, ["name", "startsOn", "endsOn", "categories"]);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const startsOn = date(data.startsOn);
  const endsOn = date(data.endsOn);
  const categories = data.categories;
  if (name.length < 3 || name.length > 120)
    throw new ValidationError("Informe um nome de 3 a 120 caracteres.");
  if (endsOn < startsOn)
    throw new ValidationError(
      "O término deve ser igual ou posterior ao início.",
    );
  if (
    !Array.isArray(categories) ||
    categories.length < 1 ||
    categories.length > TOURNAMENT_CATEGORIES.length ||
    categories.some(
      (item) => !TOURNAMENT_CATEGORIES.includes(item as TournamentCategoryName),
    ) ||
    new Set(categories).size !== categories.length
  ) {
    throw new ValidationError("Escolha categorias válidas, sem repetir.");
  }
  return {
    name,
    startsOn,
    endsOn,
    categories: categories as TournamentCategoryName[],
  };
}

export function parseTournamentStatus(value: unknown): "open" | "closed" {
  const data = record(value, ["status"]);
  if (data.status !== "open" && data.status !== "closed")
    throw new ValidationError("Situação de inscrições inválida.");
  return data.status;
}

export function parseTeam(value: unknown) {
  const data = record(value, ["categoryId", "customerIds"]);
  const categoryId = uuid(data.categoryId);
  if (!Array.isArray(data.customerIds) || data.customerIds.length !== 2) {
    throw new ValidationError("Escolha dois atletas.");
  }
  const customerIds = data.customerIds.map(uuid);
  if (customerIds[0] === customerIds[1])
    throw new ValidationError("Escolha dois atletas diferentes.");
  return { categoryId, customerIds };
}

export function parseWithdraw(value: unknown) {
  const data = record(value, ["status"]);
  if (data.status !== "withdrawn")
    throw new ValidationError("Situação da dupla inválida.");
}
