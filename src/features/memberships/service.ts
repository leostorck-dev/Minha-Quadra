import { collectById } from "@/lib/database/pagination";
import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { MembershipMethod } from "./validation";

export type Plan = Database["public"]["Tables"]["membership_plans"]["Row"];
export type Membership =
  Database["public"]["Tables"]["customer_memberships"]["Row"];
export type MembershipPayment =
  Database["public"]["Tables"]["membership_payments"]["Row"];
export type MembershipUsage = {
  membershipId: string;
  cycleStart: string;
  cycleEnd: string;
  attendedClasses: number;
  classesPerMonth: number | null;
  remainingClasses: number | null;
};
export type MembershipOverview = {
  plans: Plan[];
  memberships: Membership[];
  payments: MembershipPayment[];
  customers: { id: string; name: string; status: string }[];
  usage: MembershipUsage[];
};

export class MembershipConflictError extends Error {}
export class MembershipNotFoundError extends Error {}

function checkRpc(
  error: { code?: string; message?: string } | null,
  fallback: string,
): void {
  if (!error) return;
  if (error.code === "P0002") throw new MembershipNotFoundError(error.message);
  if (error.code === "23505")
    throw new MembershipConflictError(
      "O cliente já possui uma assinatura ativa.",
    );
  if (
    error.code === "22023" ||
    error.code === "23514" ||
    error.code === "23503"
  ) {
    throw new MembershipConflictError(error.message ?? fallback);
  }
  throw new Error(fallback);
}

export async function overview(
  context: AuthContext,
): Promise<MembershipOverview> {
  const supabase = await createClient();
  const [plans, memberships, payments, customers] = await Promise.all([
    collectById<Plan>((after) => {
      let query = supabase
        .from("membership_plans")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .order("id")
        .limit(200);
      if (after) query = query.gt("id", after);
      return query;
    }, "Não foi possível carregar todos os planos."),
    collectById<Membership>((after) => {
      let query = supabase
        .from("customer_memberships")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .order("id")
        .limit(200);
      if (after) query = query.gt("id", after);
      return query;
    }, "Não foi possível carregar todas as assinaturas."),
    supabase
      .from("membership_payments")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .order("paid_at", { ascending: false })
      .order("id")
      .limit(50),
    collectById<MembershipOverview["customers"][number]>((after) => {
      let query = supabase
        .from("customers")
        .select("id, name, status")
        .eq("tenant_id", context.tenantId)
        .order("id")
        .limit(200);
      if (after) query = query.gt("id", after);
      return query;
    }, "Não foi possível carregar os nomes dos clientes."),
  ]);
  if (payments.error)
    throw new Error("Não foi possível carregar os pagamentos recentes.");
  const usage: Database["public"]["Views"]["membership_class_usage"]["Row"][] =
    [];
  for (let offset = 0; offset < memberships.length; offset += 100) {
    const result = await supabase
      .from("membership_class_usage")
      .select("*")
      .eq("tenant_id", context.tenantId)
      .in(
        "membership_id",
        memberships.slice(offset, offset + 100).map((item) => item.id),
      );
    if (result.error)
      throw new Error("Não foi possível calcular o consumo de aulas.");
    usage.push(...result.data);
  }
  const usageItems = usage.map((row) => {
    if (
      !row.membership_id ||
      !row.cycle_start ||
      !row.cycle_end ||
      row.attended_classes === null
    ) {
      throw new Error("Não foi possível calcular o consumo de aulas.");
    }
    return {
      membershipId: row.membership_id,
      cycleStart: row.cycle_start,
      cycleEnd: row.cycle_end,
      attendedClasses: row.attended_classes,
      classesPerMonth: row.classes_per_month,
      remainingClasses: row.remaining_classes,
    };
  });
  return {
    plans: plans.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    memberships: memberships.sort(
      (a, b) =>
        a.next_due_on.localeCompare(b.next_due_on) || a.id.localeCompare(b.id),
    ),
    payments: payments.data ?? [],
    customers: customers.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    usage: usageItems,
  };
}

export async function createPlan(
  name: string,
  monthlyPrice: number,
  classesPerMonth: number | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_membership_plan", {
    p_name: name,
    p_monthly_price: monthlyPrice,
    p_classes_per_month: classesPerMonth as number,
  });
  checkRpc(error, "Não foi possível criar o plano.");
  return data;
}

export async function setPlanActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_membership_plan_active", {
    p_id: id,
    p_active: active,
  });
  checkRpc(error, "Não foi possível atualizar o plano.");
  return data;
}

export async function enroll(
  customerId: string,
  planId: string,
  startOn: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enroll_customer_membership", {
    p_customer_id: customerId,
    p_plan_id: planId,
    p_start_on: startOn,
  });
  checkRpc(error, "Não foi possível criar a assinatura.");
  return data;
}

export async function cancel(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_customer_membership", {
    p_id: id,
  });
  checkRpc(error, "Não foi possível cancelar a assinatura.");
  return data;
}

export async function pay(id: string, method: MembershipMethod) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_membership_due", {
    p_membership_id: id,
    p_method: method,
  });
  checkRpc(error, "Não foi possível registrar a mensalidade.");
  return data;
}
