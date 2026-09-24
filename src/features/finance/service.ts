import { Temporal } from "@js-temporal/polyfill";
import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  FinanceCreate,
  FinanceList,
  FinanceStatus,
  FinanceType,
} from "./validation";

type TransactionRow =
  Database["public"]["Tables"]["financial_transactions"]["Row"];

export type FinancialTransaction = {
  id: string;
  type: FinanceType;
  category: string;
  description: string;
  amount: number;
  status: FinanceStatus;
  dueDate: string | null;
  paidAt: string | null;
  activityOn: string;
  sourceType: "manual" | "reservation" | "refund" | "membership";
  createdAt: string;
};

export class FinancialNotFoundError extends Error {
  constructor() {
    super("Lançamento não encontrado.");
    this.name = "FinancialNotFoundError";
  }
}

export class FinancialConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialConflictError";
  }
}

function toTransaction(row: TransactionRow): FinancialTransaction {
  return {
    id: row.id,
    type: row.type as FinanceType,
    category: row.category,
    description: row.description,
    amount: row.amount,
    status: row.status as FinanceStatus,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    activityOn: row.activity_on,
    sourceType: row.source_type as FinancialTransaction["sourceType"],
    createdAt: row.created_at,
  };
}

export async function listFinancialTransactions(
  context: AuthContext,
  options: FinanceList,
) {
  const supabase = await createClient();
  const start = `${options.month}-01`;
  const end = Temporal.PlainYearMonth.from(options.month)
    .add({ months: 1 })
    .toPlainDate({ day: 1 })
    .toString();
  const pageSize = 25;
  let query = supabase
    .from("financial_transactions")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .gte("activity_on", start)
    .lt("activity_on", end);
  if (options.type !== "all") query = query.eq("type", options.type);
  if (options.status !== "all") query = query.eq("status", options.status);

  const [{ data, error, count }, { data: summaryData, error: summaryError }] =
    await Promise.all([
      query
        .order("activity_on", { ascending: false })
        .order("created_at", { ascending: false })
        .range((options.page - 1) * pageSize, options.page * pageSize - 1),
      supabase.rpc("finance_month_summary", { p_month: start }),
    ]);
  if (error || summaryError)
    throw new Error("Não foi possível carregar o financeiro.");
  const row = summaryData?.[0];
  return {
    items: (data ?? []).map(toTransaction),
    total: count ?? 0,
    page: options.page,
    pageSize,
    summary: {
      income: row?.income ?? 0,
      expense: row?.expense ?? 0,
      result: row?.result ?? 0,
      payable: row?.payable ?? 0,
    },
  };
}

export async function createFinancialTransaction(
  context: AuthContext,
  input: FinanceCreate,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      tenant_id: context.tenantId,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      status: input.status,
      due_date: input.dueDate,
    })
    .select("*")
    .single();
  if (error?.code === "23514")
    throw new FinancialConflictError("Lançamento inválido.");
  if (error || !data) throw new Error("Não foi possível criar o lançamento.");
  return toTransaction(data);
}

export async function advanceFinancialTransaction(
  context: AuthContext,
  id: string,
  status: "paid" | "cancelled",
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new FinancialNotFoundError();
  }
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("financial_transactions")
    .select("id, status, source_type")
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .maybeSingle();
  if (readError) throw new Error("Não foi possível carregar o lançamento.");
  if (!existing) throw new FinancialNotFoundError();
  if (existing.source_type !== "manual" || existing.status !== "pending") {
    throw new FinancialConflictError(
      "Apenas lançamentos manuais pendentes podem ser alterados.",
    );
  }
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ status })
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .eq("source_type", "manual")
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error?.code === "23514" || !data) {
    throw new FinancialConflictError("Este lançamento já foi alterado.");
  }
  if (error) throw new Error("Não foi possível atualizar o lançamento.");
  return toTransaction(data);
}
