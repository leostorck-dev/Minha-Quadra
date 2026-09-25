import type { AuthContext } from "@/lib/auth/context";
import { ForbiddenError } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { ClassNotFoundError } from "@/features/classes/service";
import type { PaymentMethod } from "@/features/payments/validation";

export type ClassPayment =
  Database["public"]["Tables"]["class_payments"]["Row"];

export class ClassPaymentConflictError extends Error {}

function check(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (!error) return;
  if (error.code === "P0002") throw new ClassNotFoundError(error.message);
  if (error.code === "42501") throw new ForbiddenError();
  if (["22023", "23505", "23514"].includes(error.code ?? ""))
    throw new ClassPaymentConflictError(error.message ?? fallback);
  throw new Error(fallback);
}

export async function getClassPaymentDetails(
  context: AuthContext,
  classId: string,
) {
  const supabase = await createClient();
  const { data: classSession, error: classError } = await supabase
    .from("class_sessions")
    .select("id, price, status")
    .eq("tenant_id", context.tenantId)
    .eq("id", classId)
    .maybeSingle();
  if (classError) throw new Error("Não foi possível carregar a aula.");
  if (!classSession) throw new ClassNotFoundError("Aula não encontrada.");
  const { data: payment, error } = await supabase
    .from("class_payments")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("class_id", classId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o pagamento da aula.");
  return {
    payment,
    amount: classSession.price,
    situation: payment
      ? payment.status
      : classSession.status === "cancelled"
        ? "cancelled"
        : classSession.price === 0
          ? "free"
          : "pending",
  };
}

export async function registerClassPayment(
  classId: string,
  method: PaymentMethod,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pay_class", {
    p_class_id: classId,
    p_method: method,
  });
  check(error, "Não foi possível registrar o pagamento da aula.");
  if (!data) throw new Error("Não foi possível registrar o pagamento da aula.");
  return data;
}

export async function refundClassPayment(classId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refund_class_payment", {
    p_class_id: classId,
  });
  check(error, "Não foi possível estornar o pagamento da aula.");
  if (!data) throw new Error("Não foi possível estornar o pagamento da aula.");
  return data;
}
