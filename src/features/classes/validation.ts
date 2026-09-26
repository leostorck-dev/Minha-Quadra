import { ValidationError } from "../../lib/api/validation-error.ts";

export const CLASS_KINDS = ["individual", "duo", "group", "trial"] as const;
export type ClassKind = (typeof CLASS_KINDS)[number];
export type CommissionType = "percentage" | "fixed";

export function parseClassSearch(params: URLSearchParams) {
  const page = Number(params.get("page") ?? "1");
  const status = params.get("status") ?? "all";
  const coachId = params.get("coachId");
  if (!Number.isInteger(page) || page < 1 || page > 10000)
    throw new ValidationError("Página inválida.");
  if (!["all", "scheduled", "completed", "cancelled"].includes(status))
    throw new ValidationError("Situação da aula inválida.");
  return { page, status, coachId: coachId ? uuid(coachId) : null };
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

function record(value: unknown, keys: string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new ValidationError("Dados inválidos.");
  }
  return value as Record<string, unknown>;
}

function amount(value: unknown, allowZero: boolean, label: string): number {
  const raw =
    typeof value === "number" || typeof value === "string" ? String(value) : "";
  if (
    !/^\d{1,8}(\.\d{1,2})?$/.test(raw) ||
    Number(raw) < (allowZero ? 0 : 0.01)
  ) {
    throw new ValidationError(`${label} inválido.`);
  }
  return Number(raw);
}

export function parseCoach(value: unknown) {
  const data = record(value, [
    "name",
    "phone",
    "email",
    "specialties",
    "commissionType",
    "commissionValue",
    "profileId",
  ]);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const phone =
    typeof data.phone === "string" && data.phone.trim()
      ? data.phone.trim()
      : null;
  const email =
    typeof data.email === "string" && data.email.trim()
      ? data.email.trim().toLowerCase()
      : null;
  const specialties = data.specialties;
  if (name.length < 2 || name.length > 120)
    throw new ValidationError("Nome do professor inválido.");
  if (
    phone &&
    (phone.length < 8 || phone.length > 20 || !/^[+0-9 ()-]+$/.test(phone))
  )
    throw new ValidationError("Telefone inválido.");
  if (
    email &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    throw new ValidationError("Email inválido.");
  if (
    !Array.isArray(specialties) ||
    specialties.length > 12 ||
    specialties.some(
      (item) =>
        typeof item !== "string" ||
        item.trim().length < 2 ||
        item.trim().length > 40,
    )
  ) {
    throw new ValidationError("Especialidades inválidas.");
  }
  const normalized = specialties.map((item: string) => item.trim());
  if (
    new Set(normalized.map((item) => item.toLowerCase())).size !==
    normalized.length
  )
    throw new ValidationError("Especialidade duplicada.");
  if (data.commissionType !== "percentage" && data.commissionType !== "fixed")
    throw new ValidationError("Tipo de comissão inválido.");
  const commissionValue = amount(data.commissionValue, true, "Comissão");
  if (data.commissionType === "percentage" && commissionValue > 100)
    throw new ValidationError("Comissão percentual deve ser de até 100%.");
  return {
    name,
    phone,
    email,
    specialties: normalized,
    commissionType: data.commissionType as CommissionType,
    commissionValue,
    profileId: data.profileId === null ? null : uuid(data.profileId),
  };
}

export function parseCoachStatus(value: unknown) {
  const data = record(value, ["status"]);
  if (data.status !== "active" && data.status !== "inactive")
    throw new ValidationError("Situação inválida.");
  return data.status;
}

export function parseClass(value: unknown) {
  const data = record(value, [
    "coachId",
    "courtId",
    "kind",
    "startAt",
    "endAt",
    "price",
    "customerIds",
  ]);
  const coachId = uuid(data.coachId),
    courtId = uuid(data.courtId);
  if (!CLASS_KINDS.includes(data.kind as ClassKind))
    throw new ValidationError("Tipo de aula inválido.");
  if (
    typeof data.startAt !== "string" ||
    typeof data.endAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(
      data.startAt,
    ) ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d.*(?:Z|[+-]\d\d:\d\d)$/.test(data.endAt) ||
    Number.isNaN(Date.parse(data.startAt)) ||
    Number.isNaN(Date.parse(data.endAt)) ||
    Date.parse(data.endAt) <= Date.parse(data.startAt)
  )
    throw new ValidationError("Horário da aula inválido.");
  const price = amount(data.price, true, "Valor da aula");
  if (
    !Array.isArray(data.customerIds) ||
    data.customerIds.length < 1 ||
    data.customerIds.length > 12
  )
    throw new ValidationError("Selecione de 1 a 12 alunos.");
  const customerIds = data.customerIds.map(uuid);
  if (new Set(customerIds).size !== customerIds.length)
    throw new ValidationError("Aluno duplicado.");
  if (
    ((data.kind === "individual" || data.kind === "trial") &&
      customerIds.length !== 1) ||
    (data.kind === "duo" && customerIds.length !== 2) ||
    (data.kind === "group" && customerIds.length < 3)
  ) {
    throw new ValidationError(
      "Quantidade de alunos incompatível com o tipo de aula.",
    );
  }
  return {
    coachId,
    courtId,
    kind: data.kind as ClassKind,
    startAt: data.startAt,
    endAt: data.endAt,
    price,
    customerIds,
  };
}

export function parseClassChange(value: unknown) {
  const data = record(value, ["status", "presentCustomerIds"]);
  if (data.status === "cancelled" && data.presentCustomerIds === undefined)
    return { status: "cancelled" as const };
  if (data.status !== "completed" || !Array.isArray(data.presentCustomerIds))
    throw new ValidationError("Situação da aula inválida.");
  const presentCustomerIds = data.presentCustomerIds.map(uuid);
  if (new Set(presentCustomerIds).size !== presentCustomerIds.length)
    throw new ValidationError("Aluno duplicado na presença.");
  return { status: "completed" as const, presentCustomerIds };
}
