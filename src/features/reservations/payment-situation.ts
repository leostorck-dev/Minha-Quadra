import type { ReservationStatus } from "./validation";

export type PaymentSituation =
  "pending" | "paid" | "refunded" | "cancelled" | "free";

export function derivePaymentSituation(
  status: ReservationStatus,
  price: number,
  payment: "paid" | "refunded" | null,
): PaymentSituation {
  return (
    payment ??
    (status === "cancelled" ? "cancelled" : price === 0 ? "free" : "pending")
  );
}
