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
