import { ValidationError } from "../../lib/api/validation-error.ts";

export const MEMBERSHIP_METHODS = ["pix", "cash", "card", "transfer"] as const;
export type MembershipMethod = (typeof MEMBERSHIP_METHODS)[number];

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

export function parsePlan(value: unknown) {
  const data = record(value, ["name", "monthlyPrice", "classesPerMonth"]);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const price =
    typeof data.monthlyPrice === "string" ||
    typeof data.monthlyPrice === "number"
      ? String(data.monthlyPrice)
      : "";
  if (name.length < 2 || name.length > 80)
    throw new ValidationError("Informe um nome de 2 a 80 caracteres.");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    throw new ValidationError("Informe um preço mensal válido.");
  }
  const classes = data.classesPerMonth;
  if (
    classes !== null &&
    (!Number.isInteger(classes) ||
      Number(classes) < 1 ||
      Number(classes) > 1000)
  ) {
    throw new ValidationError(
      "Aulas por mês deve ser entre 1 e 1000, ou ilimitado.",
    );
  }
  return {
    name,
    monthlyPrice: Number(price),
    classesPerMonth: classes as number | null,
  };
}

export function parsePlanStatus(value: unknown) {
  const data = record(value, ["active"]);
  if (typeof data.active !== "boolean")
    throw new ValidationError("Situação inválida.");
  return data.active;
}

export function parseEnrollment(value: unknown) {
  const data = record(value, ["customerId", "planId", "startOn"]);
  const customerId = uuid(data.customerId);
  const planId = uuid(data.planId);
  const parsed =
    typeof data.startOn === "string"
      ? new Date(`${data.startOn}T00:00:00Z`)
      : null;
  if (
    typeof data.startOn !== "string" ||
    !/^\d{4}-\d{2}-(0[1-9]|1\d|2[0-8])$/.test(data.startOn) ||
    !parsed ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== data.startOn
  ) {
    throw new ValidationError("A data de início precisa ter dia entre 1 e 28.");
  }
  return { customerId, planId, startOn: data.startOn };
}

export function parseMethod(value: unknown): MembershipMethod {
  const data = record(value, ["method"]);
  if (!MEMBERSHIP_METHODS.includes(data.method as MembershipMethod)) {
    throw new ValidationError("Selecione uma forma de pagamento válida.");
  }
  return data.method as MembershipMethod;
}

export function parseCancel(value: unknown) {
  const data = record(value, ["status"]);
  if (data.status !== "cancelled")
    throw new ValidationError("Situação inválida.");
}
