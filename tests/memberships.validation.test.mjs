import assert from "node:assert/strict";
import test from "node:test";
import {
  parseEnrollment,
  parseMethod,
  parsePlan,
} from "../src/features/memberships/validation.ts";

test("plano aceita preço e franquia ou aulas ilimitadas", () => {
  assert.deepEqual(
    parsePlan({ name: " Prata ", monthlyPrice: "320.00", classesPerMonth: 8 }),
    {
      name: "Prata",
      monthlyPrice: 320,
      classesPerMonth: 8,
    },
  );
  assert.equal(
    parsePlan({ name: "Ouro", monthlyPrice: 450, classesPerMonth: null })
      .classesPerMonth,
    null,
  );
  for (const monthlyPrice of ["0", "1.999", "100000000", "-1"]) {
    assert.throws(() =>
      parsePlan({ name: "Plano", monthlyPrice, classesPerMonth: 4 }),
    );
  }
  assert.throws(() =>
    parsePlan({ name: "Plano", monthlyPrice: 100, classesPerMonth: 0 }),
  );
});

test("adesão exige dia válido até 28 e ids válidos", () => {
  const fields = {
    customerId: "a1111111-aaaa-4111-8111-111111111119",
    planId: "b1111111-bbbb-4111-8111-111111111119",
    startOn: "2026-09-24",
  };
  assert.deepEqual(parseEnrollment(fields), fields);
  for (const startOn of [
    "2026-09-29",
    "2026-02-28x",
    "2026-13-24",
    "2026-02-00",
    "2026-02-30",
  ]) {
    assert.throws(() => parseEnrollment({ ...fields, startOn }));
  }
  assert.throws(() => parseEnrollment({ ...fields, customerId: "outro" }));
});

test("meio de pagamento é restrito", () => {
  assert.equal(parseMethod({ method: "pix" }), "pix");
  assert.throws(() => parseMethod({ method: "boleto" }));
  assert.throws(() => parseMethod({ method: "pix", amount: 1 }));
});
