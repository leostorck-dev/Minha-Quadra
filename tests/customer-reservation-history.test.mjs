import assert from "node:assert/strict";
import test from "node:test";
import { parseHistoryPage } from "../src/features/customers/reservation-history-validation.ts";
import { derivePaymentSituation } from "../src/features/reservations/payment-situation.ts";
import { ValidationError } from "../src/lib/api/validation-error.ts";

test("histórico aceita páginas válidas e rejeita entradas ambíguas", () => {
  assert.equal(parseHistoryPage(null), 1);
  assert.equal(parseHistoryPage("25"), 25);
  for (const value of ["0", "-1", "01", "1.5", "a", "10000", ""]) {
    assert.throws(() => parseHistoryPage(value), ValidationError);
  }
});

test("situação de cobrança acompanha o pagamento e preserva cancelamentos", () => {
  assert.equal(derivePaymentSituation("confirmed", 100, "paid"), "paid");
  assert.equal(
    derivePaymentSituation("cancelled", 100, "refunded"),
    "refunded",
  );
  assert.equal(derivePaymentSituation("cancelled", 100, null), "cancelled");
  assert.equal(derivePaymentSituation("completed", 0, null), "free");
  assert.equal(derivePaymentSituation("completed", 20, null), "pending");
});
