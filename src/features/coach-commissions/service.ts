import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { ClassNotFoundError } from "@/features/classes/service";
import { commissionAmount } from "./amount";

export type CoachCommissionPayout =
  Database["public"]["Tables"]["coach_commission_payouts"]["Row"];
export type CoachPayoutMethod = "pix" | "cash" | "transfer";

export class CoachCommissionConflictError extends Error {}

export async function getCoachCommissionDetails(
  context: AuthContext,
  classId: string,
) {
  const supabase = await createClient();
  const { data: classSession, error: classError } = await supabase
    .from("class_sessions")
    .select("id, price, status, commission_type, commission_value")
    .eq("tenant_id", context.tenantId)
    .eq("id", classId)
    .maybeSingle();
  if (classError) throw new Error("Não foi possível carregar a aula.");
  if (!classSession) throw new ClassNotFoundError("Aula não encontrada.");
  const { data: payout, error } = await supabase
    .from("coach_commission_payouts")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("class_id", classId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a comissão.");
  return {
    payout,
    amount: commissionAmount(
      classSession.price,
      classSession.commission_type,
      classSession.commission_value,
    ),
    classStatus: classSession.status,
  };
}

export async function registerCoachCommission(
  classId: string,
  method: CoachPayoutMethod,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_coach_commission", {
    p_class_id: classId,
    p_method: method,
  });
  if (error?.code === "P0002") throw new ClassNotFoundError(error.message);
  if (error?.code === "42501") throw new ForbiddenError();
  if (["22023", "23505"].includes(error?.code ?? ""))
    throw new CoachCommissionConflictError(error?.message);
  if (error || !data) throw new Error("Não foi possível liquidar a comissão.");
  return data;
}
