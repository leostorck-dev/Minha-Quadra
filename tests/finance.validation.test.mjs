import {
  financeSearchPattern,
  FINANCE_SOURCE_TYPES,
} from "../src/features/finance/validation.ts";
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFinanceCreate,
  parseFinanceList,
  parseFinanceUpdate,
  ValidationError,
} from "../src/features/finance/validation.ts";

const income = {
  type: "income",
  category: "Outras receitas",
  description: "Venda avulsa",
  amount: "12.34",
  status: "paid",
};

test("aceita valores monetários exatos e normaliza descrição", () => {
  assert.deepEqual(
    parseFinanceCreate({ ...income, description: " Venda avulsa " }),
    {
      ...income,
      description: "Venda avulsa",
      amount: 12.34,
      dueDate: null,
    },
  );
});

test("rejeita valores fora do limite, com precisão indevida ou identidade forjada", () => {
  for (const amount of ["0", "0.001", "100000000", "-1", "1e3", "1,20"]) {
    assert.throws(
      () => parseFinanceCreate({ ...income, amount }),
      ValidationError,
    );
  }
  assert.throws(
    () => parseFinanceCreate({ ...income, tenant_id: "outra-arena" }),
    ValidationError,
  );
});

test("exige vencimento válido em contas pendentes", () => {
  const expense = {
    ...income,
    type: "expense",
    category: "Energia",
    status: "pending",
  };
  assert.throws(() => parseFinanceCreate(expense), ValidationError);
  assert.throws(
    () => parseFinanceCreate({ ...expense, dueDate: "2026-02-30" }),
    ValidationError,
  );
  assert.equal(
    parseFinanceCreate({ ...expense, dueDate: "2026-09-30" }).dueDate,
    "2026-09-30",
  );
});

test("limita transições e filtros de listagem", () => {
  assert.deepEqual(parseFinanceUpdate({ status: "paid" }), { status: "paid" });
  assert.throws(
    () => parseFinanceUpdate({ status: "pending" }),
    ValidationError,
  );
  assert.deepEqual(
    parseFinanceList(
      new URLSearchParams("month=2026-09&page=2&type=expense&status=pending"),
    ),
    {
      month: "2026-09",
      scope: "month",
      page: 2,
      type: "expense",
      status: "pending",
      source: "all",
      category: "all",
      query: "",
    },
  );
  assert.throws(
    () => parseFinanceList(new URLSearchParams("month=2026-13")),
    ValidationError,
  );
});

test("combina origem, categoria e descrição e rejeita filtros inválidos", () => {
  for (const source of FINANCE_SOURCE_TYPES) {
    assert.equal(
      parseFinanceList(new URLSearchParams({ month: "2026-09", source }))
        .source,
      source,
    );
  }
  const filters = parseFinanceList(
    new URLSearchParams({
      month: "2026-09",
      source: "class_refund",
      category: "Estorno de aula",
      q: "  Cliente 50%  ",
    }),
  );
  assert.equal(filters.category, "Estorno de aula");
  assert.equal(filters.query, "Cliente 50%");
  assert.equal(financeSearchPattern("50%_"), "%50\\%\\_%");
  for (const invalid of [
    { source: "other" },
    { category: "other" },
    { q: "a".repeat(121) },
  ]) {
    assert.throws(
      () =>
        parseFinanceList(new URLSearchParams({ month: "2026-09", ...invalid })),
      ValidationError,
    );
  }
});

test("contas vencidas força despesas pendentes e rejeita visão inválida", () => {
  const options = parseFinanceList(
    new URLSearchParams("month=2026-09&scope=overdue&type=income&status=paid"),
  );
  assert.equal(options.type, "expense");
  assert.equal(options.status, "pending");
  assert.equal(options.scope, "overdue");
  assert.throws(
    () => parseFinanceList(new URLSearchParams("month=2026-09&scope=anything")),
    ValidationError,
  );
});

import { financeWindow } from "../src/features/finance/validation.ts";
import { Temporal } from "@js-temporal/polyfill";
test("vencidas usa data da arena na virada UTC e não restringe mês", () => {
  const instant = Temporal.Instant.from("2026-10-01T01:00:00Z");
  assert.deepEqual(
    financeWindow(
      { scope: "overdue", month: "2020-01" },
      "America/Sao_Paulo",
      instant,
    ),
    { column: "due_date", start: null, end: "2026-09-30" },
  );
  assert.deepEqual(
    financeWindow(
      { scope: "month", month: "2026-12" },
      "America/Sao_Paulo",
      instant,
    ),
    { column: "activity_on", start: "2026-12-01", end: "2027-01-01" },
  );
});
