import { ValidationError } from "../../lib/api/validation-error.ts";

export { ValidationError };

export type CustomerStatus = "active" | "inactive";

export type CustomerCreateInput = {
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
};

export type CustomerUpdateInput = Partial<CustomerCreateInput> & {
  status?: CustomerStatus;
};

const createKeys = new Set(["name", "phone", "email", "birthDate", "notes"]);
const updateKeys = new Set([...createKeys, "status"]);

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Envie um objeto JSON válido.");
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
) {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ValidationError("O payload contém campos não permitidos.");
  }
}

function parseName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Informe o nome do cliente.");
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 120) {
    throw new ValidationError("O nome deve ter entre 2 e 120 caracteres.");
  }
  return name;
}

function parsePhone(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ValidationError("Telefone inválido.");
  }
  const phone = value.trim();
  const digitCount = phone.replace(/\D/g, "").length;
  if (
    phone.length < 8 ||
    phone.length > 20 ||
    digitCount < 8 ||
    digitCount > 15 ||
    !/^[+0-9 ()-]+$/.test(phone)
  ) {
    throw new ValidationError("Telefone inválido.");
  }
  return phone;
}

function parseEmail(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new ValidationError("Email inválido.");
  }
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Email inválido.");
  }
  return email;
}

function parseBirthDate(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError("Data de nascimento inválida.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date.getTime() > Date.now()
  ) {
    throw new ValidationError("Data de nascimento inválida.");
  }
  return value;
}

function parseNotes(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2000) {
    throw new ValidationError("Observações devem ter até 2000 caracteres.");
  }
  return value.trim() || null;
}

export function parseCustomerCreate(value: unknown): CustomerCreateInput {
  const input = asRecord(value);
  rejectUnknownKeys(input, createKeys);

  const phone = parsePhone(input.phone ?? null);
  const email = parseEmail(input.email ?? null);
  if (!phone && !email) {
    throw new ValidationError("Informe telefone ou email.");
  }

  return {
    name: parseName(input.name),
    phone,
    email,
    birthDate: parseBirthDate(input.birthDate ?? null),
    notes: parseNotes(input.notes ?? null),
  };
}

export function parseCustomerUpdate(value: unknown): CustomerUpdateInput {
  const input = asRecord(value);
  rejectUnknownKeys(input, updateKeys);
  if (Object.keys(input).length === 0) {
    throw new ValidationError("Informe ao menos um campo para atualizar.");
  }

  const output: CustomerUpdateInput = {};
  if ("name" in input) output.name = parseName(input.name);
  if ("phone" in input) output.phone = parsePhone(input.phone);
  if ("email" in input) output.email = parseEmail(input.email);
  if ("birthDate" in input) {
    output.birthDate = parseBirthDate(input.birthDate);
  }
  if ("notes" in input) output.notes = parseNotes(input.notes);
  if ("status" in input) {
    if (input.status !== "active" && input.status !== "inactive") {
      throw new ValidationError("Status inválido.");
    }
    output.status = input.status;
  }
  return output;
}

export function parseCustomerSearch(
  search: string | null,
  page: string | null,
  status: string | null,
) {
  const query = (search ?? "").trim();
  if (query.length > 80) throw new ValidationError("Busca muito longa.");

  const pageNumber = page === null ? 1 : Number(page);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000) {
    throw new ValidationError("Página inválida.");
  }
  if (
    status !== null &&
    status !== "active" &&
    status !== "inactive" &&
    status !== "all"
  ) {
    throw new ValidationError("Filtro de status inválido.");
  }
  return { query, page: pageNumber, status: status ?? "active" } as const;
}
