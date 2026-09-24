import { ValidationError } from "@/lib/api/validation-error";

export const PAYMENT_METHODS = [
  "PIX",
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function objectWithOnlyKeys(value: unknown, keys: string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new ValidationError("Dados de pagamento inválidos.");
  }
  return value as Record<string, unknown>;
}

export function parsePaymentCreate(value: unknown): { method: PaymentMethod } {
  const data = objectWithOnlyKeys(value, ["method"]);
  if (!PAYMENT_METHODS.includes(data.method as PaymentMethod)) {
    throw new ValidationError("Selecione uma forma de pagamento válida.");
  }
  return { method: data.method as PaymentMethod };
}

export function parsePaymentRefund(value: unknown) {
  const data = objectWithOnlyKeys(value, ["status"]);
  if (data.status !== "refunded") {
    throw new ValidationError("Apenas o estorno pode alterar um pagamento.");
  }
  return { status: "refunded" as const };
}
