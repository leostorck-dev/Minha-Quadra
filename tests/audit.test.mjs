import assert from "node:assert/strict";
import test from "node:test";
import { auditReport } from "../src/features/audit/reports.ts";
import {
  auditDateWindow,
  parseAuditFilters,
} from "../src/features/audit/validation.ts";
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

test("período da auditoria valida calendário e ordem das datas", () => {
  const filters = parseAuditFilters(
    new URLSearchParams({ from: "2026-09-29", to: "2026-09-29" }),
  );
  assert.equal(filters.from, "2026-09-29");
  assert.equal(filters.to, "2026-09-29");
  assert.deepEqual(auditDateWindow(filters, "America/Sao_Paulo"), {
    start: "2026-09-29T03:00:00Z",
    end: "2026-09-30T03:00:00Z",
  });
  for (const from of ["2026-02-30", "2026-2-3", "invalida"]) {
    assert.throws(
      () => parseAuditFilters(new URLSearchParams({ from })),
      ValidationError,
    );
  }
  assert.throws(
    () =>
      parseAuditFilters(
        new URLSearchParams({ from: "2026-09-30", to: "2026-09-29" }),
      ),
    ValidationError,
  );
});

test("limites independentes e dias de horário de verão usam meia-noite local", () => {
  assert.deepEqual(
    auditDateWindow(
      parseAuditFilters(
        new URLSearchParams({ from: "2026-03-08", to: "2026-03-08" }),
      ),
      "America/New_York",
    ),
    {
      start: "2026-03-08T05:00:00Z",
      end: "2026-03-09T04:00:00Z",
    },
  );
  assert.deepEqual(
    auditDateWindow(
      parseAuditFilters(
        new URLSearchParams({ from: "2026-11-01", to: "2026-11-01" }),
      ),
      "America/New_York",
    ),
    {
      start: "2026-11-01T04:00:00Z",
      end: "2026-11-02T05:00:00Z",
    },
  );
  assert.equal(
    auditDateWindow(
      parseAuditFilters(new URLSearchParams({ from: "2026-09-29" })),
      "UTC",
    ).end,
    null,
  );
  assert.equal(
    auditDateWindow(
      parseAuditFilters(new URLSearchParams({ to: "2026-09-29" })),
      "UTC",
    ).start,
    null,
  );
});
