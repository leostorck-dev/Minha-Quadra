import { financeSearchPattern, financeWindow } from "./validation";
import { collectById } from "@/lib/database/pagination";
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
  sourceType:
    | "manual"
    | "reservation"
    | "refund"
    | "membership"
    | "class"
    | "class_refund"
    | "coach_commission";
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
  const { data: arena, error: arenaError } = await supabase
    .from("tenants")
    .select("timezone")
    .eq("id", context.tenantId)
    .single();
  if (arenaError || !arena)
    throw new Error("Não foi possível carregar o fuso da arena.");
  const window = financeWindow(options, arena.timezone);
  const pageSize = 25;
  let query = supabase
    .from("financial_transactions")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId)
    .lt(window.column, window.end);
  if (window.start) query = query.gte(window.column, window.start);
  if (options.type !== "all") query = query.eq("type", options.type);
  if (options.status !== "all") query = query.eq("status", options.status);
  if (options.source !== "all") query = query.eq("source_type", options.source);
  if (options.category !== "all")
    query = query.eq("category", options.category);
  if (options.query)
    query = query.ilike("description", financeSearchPattern(options.query));

  const [{ data, error, count }, { data: summaryData, error: summaryError }] =
    await Promise.all([
      query
        .order("activity_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range((options.page - 1) * pageSize, options.page * pageSize - 1),
      options.scope === "overdue"
        ? collectById<{ id: string; amount: number }>((after) => {
            let totals = supabase
              .from("financial_transactions")
              .select("id, amount")
              .eq("tenant_id", context.tenantId)
              .eq("type", "expense")
              .eq("status", "pending")
              .lt("due_date", window.end)
              .order("id")
              .limit(200);
            if (after) totals = totals.gt("id", after);
            return totals;
          }, "Não foi possível carregar o total vencido.").then((rows) => ({
            data: [
              {
                income: 0,
                expense: 0,
                result: 0,
                payable:
                  rows.reduce(
                    (sum, row) => sum + Math.round(row.amount * 100),
                    0,
                  ) / 100,
              },
            ],
            error: null,
          }))
        : supabase.rpc("finance_month_summary", { p_month: window.start! }),
    ]);
  if (error || summaryError)
    throw new Error("Não foi possível carregar o financeiro.");
  const row = summaryData?.[0];
  return {
    items: (data ?? []).map(toTransaction),
    total: count ?? 0,
    page: options.page,
    pageSize,
    overdueBefore: options.scope === "overdue" ? window.end : null,
    summary: {
      income: row?.income ?? 0,
      expense: row?.expense ?? 0,
      result: row?.result ?? 0,
      payable: row?.payable ?? 0,
    },
  };
}

export async function exportFinancialTransactions(
  context: AuthContext,
  options: FinanceList,
): Promise<FinancialTransaction[]> {
  const supabase = await createClient();
  const { data: arena, error: arenaError } = await supabase
    .from("tenants")
    .select("timezone")
    .eq("id", context.tenantId)
    .single();
  if (arenaError || !arena)
    throw new Error("Não foi possível carregar o fuso da arena.");
  const window = financeWindow(options, arena.timezone);
  const rows = await collectById<TransactionRow>((after) => {
    let query = supabase
      .from("financial_transactions")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .lt(window.column, window.end)
      .order("id")
      .limit(200);
    if (window.start) query = query.gte(window.column, window.start);
    if (options.type !== "all") query = query.eq("type", options.type);
    if (options.status !== "all") query = query.eq("status", options.status);
    if (options.source !== "all")
      query = query.eq("source_type", options.source);
    if (options.category !== "all")
      query = query.eq("category", options.category);
    if (options.query)
      query = query.ilike("description", financeSearchPattern(options.query));
    if (after) query = query.gt("id", after);
    return query;
  }, "Não foi possível exportar todos os lançamentos. Tente novamente.");
  return rows
    .map(toTransaction)
    .sort(
      (a, b) =>
        a.activityOn.localeCompare(b.activityOn) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
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
