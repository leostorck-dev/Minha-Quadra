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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
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

export function parseDraw(value: unknown) {
  const data = record(value, ["categoryId", "groupSize"]);
  if (data.groupSize !== 3 && data.groupSize !== 4)
    throw new ValidationError("Escolha grupos de até 3 ou 4 duplas.");
  return { categoryId: uuid(data.categoryId), groupSize: data.groupSize };
}

export function parseBracket(value: unknown) {
  const data = record(value, ["categoryId", "qualifiers"]);
  if (data.qualifiers !== 1 && data.qualifiers !== 2)
    throw new ValidationError("Escolha 1 ou 2 classificadas por grupo.");
  return { categoryId: uuid(data.categoryId), qualifiers: data.qualifiers };
}

export function parseTiebreak(value: unknown) {
  const data = record(value, ["teamIds", "expectedVersion", "reason"]);
  if (
    !Array.isArray(data.teamIds) ||
    data.teamIds.length < 2 ||
    data.teamIds.length > 4
  )
    throw new ValidationError("Informe todas as duplas do grupo.");
  const teamIds = data.teamIds.map(uuid);
  if (new Set(teamIds).size !== teamIds.length)
    throw new ValidationError("Não repita duplas no desempate.");
  if (
    typeof data.expectedVersion !== "number" ||
    !Number.isInteger(data.expectedVersion) ||
    data.expectedVersion < 0 ||
    data.expectedVersion > 2147483646
  )
    throw new ValidationError("Versão da classificação inválida.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (reason.length < 3 || reason.length > 200)
    throw new ValidationError(
      "Informe uma justificativa de 3 a 200 caracteres.",
    );
  return { teamIds, expectedVersion: data.expectedVersion, reason };
}

export function parseResult(value: unknown) {
  const data = record(value, ["scoreA", "scoreB", "expectedVersion", "reason"]);
  const score = (v: unknown): number | null => {
    if (v === null) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 99)
      throw new ValidationError("Informe placares inteiros de 0 a 99.");
    return v;
  };
  const scoreA = score(data.scoreA),
    scoreB = score(data.scoreB);
  if (
    (scoreA === null) !== (scoreB === null) ||
    (scoreA !== null && scoreA === scoreB)
  )
    throw new ValidationError("Informe os dois placares, sem empate.");
  if (
    typeof data.expectedVersion !== "number" ||
    !Number.isInteger(data.expectedVersion) ||
    data.expectedVersion < 0 ||
    data.expectedVersion > 2147483646
  )
    throw new ValidationError("Versão do resultado inválida.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (reason.length < 3 || reason.length > 200)
    throw new ValidationError(
      "Informe uma justificativa de 3 a 200 caracteres.",
    );
  return { scoreA, scoreB, expectedVersion: data.expectedVersion, reason };
}
