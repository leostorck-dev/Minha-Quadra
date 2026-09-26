import assert from "node:assert/strict";
import test from "node:test";
import {
  financeReport,
  FINANCE_SOURCES,
} from "../src/features/finance/reports.ts";

const transaction = {
  id: "transaction-id",
  type: "income",
  category: "Aulas",
  description: "Aula avulsa",
  amount: 125.1,
  status: "paid",
  dueDate: null,
  paidAt: "2026-09-26T02:00:00-03:00",
  activityOn: "2026-09-26",
  sourceType: "class",
  createdAt: "2026-09-26T05:00:00Z",
};

test("financial CSV preserves decimal cents and distinguishes each revenue and expense source", () => {
  const csv = financeReport(
    Object.keys(FINANCE_SOURCES).map((sourceType) => ({
      ...transaction,
      sourceType,
    })),
  );
  assert.ok(csv.startsWith("\ufeff"));
  assert.equal(csv.split("\r\n").length, 9);
  assert.equal(csv.match(/"125,10"/g).length, 7);
  assert.ok(csv.includes('"2026-09-26T05:00:00.000Z"'));
  for (const source of Object.values(FINANCE_SOURCES))
    assert.ok(csv.includes(`"${source}"`));
  assert.ok(
    financeReport([{ ...transaction, amount: 0.01 }]).includes('"0,01"'),
  );
  assert.ok(
    financeReport([{ ...transaction, amount: 99999999.99 }]).includes(
      '"99999999,99"',
    ),
  );
});

test("financial CSV keeps pending and cancelled rows explicit and neutralizes spreadsheet formulas", () => {
  const csv = financeReport([
    {
      ...transaction,
      type: "expense",
      status: "pending",
      paidAt: null,
      dueDate: "2026-09-30",
      description: '=HYPERLINK("https://example.com")',
    },
    {
      ...transaction,
      status: "cancelled",
      paidAt: null,
      description: "Descrição; com\nquebra",
    },
  ]);
  assert.ok(csv.includes('"Despesa"'));
  assert.ok(csv.includes('"Pendente";"2026-09-30";""'));
  assert.ok(csv.includes('"Cancelado";"";""'));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.com"")"'));
  assert.ok(csv.includes('"Descrição; com\nquebra"'));
});

test("empty export remains a valid CSV with headers and large results retain all rows", () => {
  assert.equal(financeReport([]).split("\r\n").length, 2);
  const items = Array.from({ length: 1105 }, (_, index) => ({
    ...transaction,
    id: `id-${index}`,
  }));
  const csv = financeReport(items);
  assert.equal(csv.split("\r\n").length, 1107);
  assert.ok(csv.includes('"id-1104"'));
});
