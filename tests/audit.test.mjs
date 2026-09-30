import assert from "node:assert/strict";
import test from "node:test";
import { auditReport } from "../src/features/audit/reports.ts";
import { parseAuditFilters } from "../src/features/audit/validation.ts";
import { ValidationError } from "../src/lib/api/validation-error.ts";

const entry = {
  id: "11111111-1111-4111-8111-111111111111",
  event: "payment.created",
  entityType: "payment",
  entityId: "22222222-2222-4222-8222-222222222222",
  actorId: "33333333-3333-4333-8333-333333333333",
  actorName: '=Gestor "A"',
  createdAt: "2026-09-29T23:30:00-03:00",
};

test("CSV da auditoria protege fórmulas e explicita UTC sem detalhes", () => {
  const result = auditReport([{ ...entry, details: { private: "segredo" } }]);
  assert.ok(result.startsWith("\ufeff"));
  assert.ok(result.includes('"2026-09-30T02:30:00.000Z"'));
  assert.ok(result.includes('"\'=Gestor ""A"""'));
  assert.ok(result.includes('"payment.created"'));
  assert.ok(!result.includes("segredo"));
});

test("CSV vazio preserva cabeçalho e mais de mil eventos não somem", () => {
  assert.equal(auditReport([]).split("\r\n").length, 2);
  const rows = Array.from({ length: 1105 }, (_, index) => ({
    ...entry,
    id: String(index),
  }));
  assert.equal(auditReport(rows).split("\r\n").length, 1107);
});

test("auditoria rejeita tipo inválido e aceita todos os tipos disponíveis", () => {
  for (const type of ["all", "customer", "reservation", "payment"]) {
    assert.equal(parseAuditFilters(new URLSearchParams({ type })).type, type);
  }
  assert.throws(
    () => parseAuditFilters(new URLSearchParams({ type: "unknown" })),
    ValidationError,
  );
});
