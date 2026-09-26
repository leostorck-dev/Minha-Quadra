import { parsePaymentSearch } from "../src/features/memberships/validation.ts";
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

test("histórico de mensalidades valida paginação e assinatura", () => {
  assert.deepEqual(parsePaymentSearch(new URLSearchParams()), {
    page: 1,
    membershipId: null,
    month: null,
    method: "all",
  });
  const membershipId = "a1111111-aaaa-4111-8111-111111111119";
  assert.deepEqual(
    parsePaymentSearch(new URLSearchParams({ page: "3", membershipId })),
    { page: 3, membershipId, month: null, method: "all" },
  );
  for (const page of ["0", "", "-1", "1.5", "NaN", "10001"])
    assert.throws(() => parsePaymentSearch(new URLSearchParams({ page })));
  assert.throws(() =>
    parsePaymentSearch(new URLSearchParams({ membershipId: "invalid" })),
  );
});

import { paymentMonthWindow } from "../src/features/memberships/validation.ts";
test("histórico combina mês e meio e rejeita filtros inválidos", () => {
  const result = parsePaymentSearch(
    new URLSearchParams("month=2026-09&method=pix&page=2"),
  );
  assert.equal(result.month, "2026-09");
  assert.equal(result.method, "pix");
  assert.equal(result.page, 2);
  for (const query of [
    "month=2026-13",
    "month=2026-9",
    "month=2026-09-01",
    "method=boleto",
  ])
    assert.throws(() => parsePaymentSearch(new URLSearchParams(query)));
  assert.equal(parsePaymentSearch(new URLSearchParams("month=")).month, null);
});
test("mês recebido usa meia-noite local e atravessa o ano", () => {
  assert.deepEqual(paymentMonthWindow("2026-12", "America/Sao_Paulo"), {
    start: "2026-12-01T03:00:00Z",
    end: "2027-01-01T03:00:00Z",
  });
  assert.deepEqual(paymentMonthWindow("2026-09", "Asia/Tokyo"), {
    start: "2026-08-31T15:00:00Z",
    end: "2026-09-30T15:00:00Z",
  });
});

import { membershipPaymentReport } from "../src/features/memberships/reports.ts";
test("CSV de mensalidades separa recebimento de vencimento e mantém centavos e nomes", () => {
  const item = {
    id: "pagamento",
    membership_id: "assinatura",
    customerName: "=1+1",
    planName: "Plano; Ouro",
    period_due_on: "2026-08-10",
    amount: 123.45,
    method: "pix",
    paid_at: "2026-09-26T10:00:00-03:00",
  };
  const report = membershipPaymentReport([item]);
  assert.ok(report.startsWith("\ufeff"));
  assert.ok(report.includes("'=1+1"));
  assert.ok(report.includes('"Plano; Ouro"'));
  assert.ok(
    report.includes('"2026-08-10";"123,45";"Pix";"2026-09-26T13:00:00.000Z"'),
  );
  assert.equal(membershipPaymentReport([]).split("\r\n").length, 2);
  assert.equal(
    membershipPaymentReport(Array.from({ length: 1105 }, () => item)).split(
      "\r\n",
    ).length,
    1107,
  );
});
