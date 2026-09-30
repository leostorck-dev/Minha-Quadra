import { ValidationError } from "../../lib/api/validation-error.ts";

export function parseHistoryPage(value: string | null) {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,3}$/.test(value))
    throw new ValidationError("Página inválida.");
  return Number(value);
}
