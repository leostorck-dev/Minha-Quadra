import type { Reservation } from "./service";
import { ValidationError } from "../../lib/api/validation-error.ts";

export const paymentSituations = [
  "all",
  "pending",
  "paid",
  "refunded",
  "cancelled",
  "free",
] as const;
export type PaymentSituationFilter = (typeof paymentSituations)[number];

export function assertPaymentFilterPermission(
  role: string,
  situation: PaymentSituationFilter,
) {
  if (role === "COACH" && situation !== "all")
    throw new ValidationError(
      "Filtro de cobrança não permitido para professor.",
    );
}

export function filterReservationsByPayment(
  items: Reservation[],
  situation: PaymentSituationFilter,
) {
  return situation === "all"
    ? items
    : items.filter(
        (item) =>
          item.kind === "booking" && item.paymentSituation === situation,
      );
}
