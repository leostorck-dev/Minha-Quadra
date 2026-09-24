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
    { month: "2026-09", page: 2, type: "expense", status: "pending" },
  );
  assert.throws(
    () => parseFinanceList(new URLSearchParams("month=2026-13")),
    ValidationError,
  );
});
