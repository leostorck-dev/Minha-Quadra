import assert from "node:assert/strict";
import test from "node:test";
import { commissionAmount } from "../src/features/coach-commissions/amount.ts";

test("comissão percentual arredonda centavos como o banco", () => {
  assert.equal(commissionAmount(99.99, "percentage", 17.5), 17.5);
  assert.equal(commissionAmount(0.05, "percentage", 10), 0.01);
  assert.equal(commissionAmount(120, "percentage", 0), 0);
});

test("comissão fixa preserva o valor por aula", () => {
  assert.equal(commissionAmount(0, "fixed", 15.3), 15.3);
});
