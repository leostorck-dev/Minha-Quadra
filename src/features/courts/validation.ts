import { ValidationError } from "../../lib/api/validation-error.ts";

export type CourtStatus = "available" | "maintenance" | "inactive";
export type CourtFields = {
  name: string;
  sport: string;
  description: string | null;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
};
export type CourtUpdate = Partial<CourtFields> & { status?: CourtStatus };

const fields = new Set([
  "name",
  "sport",
  "description",
  "pricePerHour",
  "openingTime",
  "closingTime",
]);
const updateFields = new Set([...fields, "status"]);
const statuses = new Set<CourtStatus>(["available", "maintenance", "inactive"]);

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Envie um objeto JSON válido.");
  }
  return value as Record<string, unknown>;
}

function allowedKeys(input: Record<string, unknown>, allowed: Set<string>) {
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new ValidationError("O payload contém campos não permitidos.");
  }
}

function requiredText(value: unknown, label: string, max: number) {
  if (typeof value !== "string")
    throw new ValidationError(`${label} inválido.`);
  const text = value.trim();
  if (text.length < 2 || text.length > max) {
    throw new ValidationError(`${label} deve ter entre 2 e ${max} caracteres.`);
  }
  return text;
}

function description(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 1000) {
    throw new ValidationError("Descrição deve ter até 1000 caracteres.");
  }
  return value.trim() || null;
}

function price(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(value)
  ) {
    throw new ValidationError(
      "Preço deve estar entre 0 e 99.999,99, com até duas casas decimais.",
    );
  }
  return Number(value);
}

function time(value: unknown, label: string) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new ValidationError(`${label} deve estar em HH:mm.`);
  }
  return value;
}

export function assertCourtHours(opening: string, closing: string) {
  if (opening >= closing) {
    throw new ValidationError("O fechamento deve ser posterior à abertura.");
  }
}

export function parseCourtCreate(value: unknown): CourtFields {
  const input = record(value);
  allowedKeys(input, fields);
  const openingTime = time(input.openingTime, "Abertura");
  const closingTime = time(input.closingTime, "Fechamento");
  assertCourtHours(openingTime, closingTime);
  return {
    name: requiredText(input.name, "Nome", 120),
    sport: requiredText(input.sport, "Modalidade", 60),
    description: description(input.description ?? null),
    pricePerHour: price(input.pricePerHour),
    openingTime,
    closingTime,
  };
}

export function parseCourtUpdate(value: unknown): CourtUpdate {
  const input = record(value);
  allowedKeys(input, updateFields);
  if (!Object.keys(input).length) {
    throw new ValidationError("Informe ao menos um campo para atualizar.");
  }
  const output: CourtUpdate = {};
  if ("name" in input) output.name = requiredText(input.name, "Nome", 120);
  if ("sport" in input)
    output.sport = requiredText(input.sport, "Modalidade", 60);
  if ("description" in input)
    output.description = description(input.description);
  if ("pricePerHour" in input) output.pricePerHour = price(input.pricePerHour);
  if ("openingTime" in input)
    output.openingTime = time(input.openingTime, "Abertura");
  if ("closingTime" in input)
    output.closingTime = time(input.closingTime, "Fechamento");
  if ("status" in input) {
    if (!statuses.has(input.status as CourtStatus)) {
      throw new ValidationError("Status inválido.");
    }
    output.status = input.status as CourtStatus;
  }
  if (output.openingTime && output.closingTime) {
    assertCourtHours(output.openingTime, output.closingTime);
  }
  return output;
}

export function parseCourtSearch(search: string | null, status: string | null) {
  const query = (search ?? "").trim();
  if (query.length > 80) throw new ValidationError("Busca muito longa.");
  if (
    status !== null &&
    status !== "all" &&
    !statuses.has(status as CourtStatus)
  ) {
    throw new ValidationError("Filtro de status inválido.");
  }
  return { query, status: (status ?? "all") as CourtStatus | "all" };
}
