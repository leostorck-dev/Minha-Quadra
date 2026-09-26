import { Temporal } from "@js-temporal/polyfill";
import { ValidationError } from "../../lib/api/validation-error.ts";

export { ValidationError };

export const FINANCE_CATEGORIES = {
  income: [
    "Reserva de quadra",
    "Aulas",
    "Mensalidades",
    "Produtos",
    "Outras receitas",
  ],
  expense: [
    "Aluguel",
    "Energia",
    "Água",
    "Manutenção",
    "Professores",
    "Funcionários",
    "Fornecedores",
    "Equipamentos",
    "Outras despesas",
  ],
} as const;

export type FinanceType = keyof typeof FINANCE_CATEGORIES;
export type FinanceStatus = "pending" | "paid" | "cancelled";

export const FINANCE_SOURCE_TYPES = [
  "manual",
  "reservation",
  "refund",
  "membership",
  "class",
  "class_refund",
  "coach_commission",
] as const;
export type FinanceSource = (typeof FINANCE_SOURCE_TYPES)[number];
export const FINANCE_FILTER_CATEGORIES: readonly string[] = [
  ...FINANCE_CATEGORIES.income,
  ...FINANCE_CATEGORIES.expense,
  "Estorno de reserva",
  "Estorno de aula",
];

export function financeSearchPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export type FinanceCreate = {
  type: FinanceType;
  category: string;
  description: string;
  amount: number;
  status: "pending" | "paid";
  dueDate: string | null;
};

export type FinanceScope = "month" | "overdue" | "upcoming";

export type FinanceList = {
  month: string;
  scope: FinanceScope;
  page: number;
  type: FinanceType | "all";
  status: FinanceStatus | "all";
  source: FinanceSource | "all";
  category: string;
  query: string;
};

function objectWithKeys(value: unknown, keys: string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  ) {
    throw new ValidationError("Dados financeiros inválidos.");
  }
  return value as Record<string, unknown>;
}

export function parseFinanceCreate(value: unknown): FinanceCreate {
  const data = objectWithKeys(value, [
    "type",
    "category",
    "description",
    "amount",
    "status",
    "dueDate",
  ]);
  if (data.type !== "income" && data.type !== "expense") {
    throw new ValidationError("Selecione receita ou despesa.");
  }
  const type = data.type;
  if (
    typeof data.category !== "string" ||
    !(FINANCE_CATEGORIES[type] as readonly string[]).includes(data.category)
  ) {
    throw new ValidationError("Selecione uma categoria válida.");
  }
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  if (description.length < 1 || description.length > 240) {
    throw new ValidationError("A descrição deve ter até 240 caracteres.");
  }
  if (
    typeof data.amount !== "string" ||
    !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(data.amount)
  ) {
    throw new ValidationError(
      "Informe um valor positivo com até duas casas decimais.",
    );
  }
  const [whole, decimal = ""] = data.amount.split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (cents <= 0 || cents > 9_999_999_999) {
    throw new ValidationError("Valor fora do limite permitido.");
  }
  if (data.status !== "pending" && data.status !== "paid") {
    throw new ValidationError("Situação financeira inválida.");
  }
  let dueDate: string | null = null;
  if (
    data.dueDate !== undefined &&
    data.dueDate !== null &&
    data.dueDate !== ""
  ) {
    if (
      typeof data.dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)
    ) {
      throw new ValidationError("Data de vencimento inválida.");
    }
    try {
      dueDate = Temporal.PlainDate.from(data.dueDate).toString();
    } catch {
      throw new ValidationError("Data de vencimento inválida.");
    }
  }
  if (type === "expense" && data.status === "pending" && !dueDate) {
    throw new ValidationError("Informe o vencimento da conta a pagar.");
  }
  return {
    type,
    category: data.category,
    description,
    amount: cents / 100,
    status: data.status,
    dueDate,
  };
}

export function parseFinanceUpdate(value: unknown) {
  const data = objectWithKeys(value, ["status"]);
  if (data.status !== "paid" && data.status !== "cancelled") {
    throw new ValidationError(
      "Apenas contas pendentes podem ser pagas ou canceladas.",
    );
  }
  return { status: data.status } as { status: "paid" | "cancelled" };
}

export function parseFinanceList(params: URLSearchParams): FinanceList {
  const scope = params.get("scope") ?? "month";
  if (scope !== "month" && scope !== "overdue" && scope !== "upcoming")
    throw new ValidationError("Visão financeira inválida.");
  const month = params.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new ValidationError("Informe um mês no formato AAAA-MM.");
  }
  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    throw new ValidationError("Página inválida.");
  }
  const type = params.get("type") ?? "all";
  if (type !== "all" && type !== "income" && type !== "expense") {
    throw new ValidationError("Filtro de tipo inválido.");
  }
  const status = params.get("status") ?? "all";
  if (
    status !== "all" &&
    status !== "pending" &&
    status !== "paid" &&
    status !== "cancelled"
  ) {
    throw new ValidationError("Filtro de situação inválido.");
  }
  const source = params.get("source") ?? "all";
  const category = params.get("category") ?? "all";
  const query = (params.get("q") ?? "").trim();
  if (
    source !== "all" &&
    !FINANCE_SOURCE_TYPES.includes(source as FinanceSource)
  )
    throw new ValidationError("Origem inválida.");
  if (category !== "all" && !FINANCE_FILTER_CATEGORIES.includes(category))
    throw new ValidationError("Categoria inválida.");
  if (query.length > 120)
    throw new ValidationError("A busca deve ter até 120 caracteres.");
  return {
    month,
    scope,
    page,
    type: scope !== "month" ? "expense" : type,
    status: scope !== "month" ? "pending" : status,
    source: source as FinanceSource | "all",
    category,
    query,
  };
}

export function financeWindow(
  options: Pick<FinanceList, "month" | "scope">,
  timezone: string,
  instant = Temporal.Now.instant(),
) {
  const today = instant.toZonedDateTimeISO(timezone).toPlainDate();
  if (options.scope === "upcoming") {
    return {
      column: "due_date" as const,
      start: today.toString(),
      end: today.add({ days: 7 }).toString(),
    };
  }
  if (options.scope === "overdue") {
    return {
      column: "due_date" as const,
      start: null,
      end: today.toString(),
    };
  }
  return {
    column: "activity_on" as const,
    start: options.month + "-01",
    end: Temporal.PlainYearMonth.from(options.month)
      .add({ months: 1 })
      .toPlainDate({ day: 1 })
      .toString(),
  };
}
