import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ClassKind, CommissionType } from "./validation";

export type Coach = Database["public"]["Tables"]["coaches"]["Row"];
export type ClassSession =
  Database["public"]["Tables"]["class_sessions"]["Row"];
export type ClassStudent =
  Database["public"]["Tables"]["class_students"]["Row"];
export type ClassOverview = {
  coaches: Coach[];
  classes: ClassSession[];
  students: ClassStudent[];
  reservations: {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  }[];
  customers: { id: string; name: string; status: string }[];
  courts: { id: string; name: string; status: string }[];
  profiles: { id: string; name: string }[];
};

export class ClassConflictError extends Error {}
export class ClassNotFoundError extends Error {}

function check(
  error: { code?: string; message?: string } | null,
  fallback: string,
): void {
  if (!error) return;
  if (error.code === "P0002") throw new ClassNotFoundError(error.message);
  if (error.code === "23P01")
    throw new ClassConflictError(
      error.message?.includes("Professor já tem aula")
        ? "Professor já tem aula nesse horário."
        : "Já existe reserva ou aula nesse horário e quadra.",
    );
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? ""))
    throw new ClassConflictError(error.message ?? fallback);
  throw new Error(fallback);
}

export async function overview(context: AuthContext): Promise<ClassOverview> {
  const supabase = await createClient();
  const [coaches, classes, students, customers, courts, profiles] =
    await Promise.all([
      supabase
        .from("coaches")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .order("name"),
      supabase
        .from("class_sessions")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("class_students")
        .select("*")
        .eq("tenant_id", context.tenantId)
        .limit(1000),
      supabase
        .from("customers")
        .select("id, name, status")
        .eq("tenant_id", context.tenantId)
        .order("name")
        .limit(500),
      supabase
        .from("courts")
        .select("id, name, status")
        .eq("tenant_id", context.tenantId)
        .order("name"),
      context.role === "OWNER"
        ? supabase
            .from("profiles")
            .select("id, name")
            .eq("tenant_id", context.tenantId)
            .eq("role", "COACH")
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (
    coaches.error ||
    classes.error ||
    students.error ||
    customers.error ||
    courts.error ||
    profiles.error
  )
    throw new Error("Não foi possível carregar as aulas.");
  const reservationIds = (classes.data ?? []).map(
    (item) => item.reservation_id,
  );
  const reservations = reservationIds.length
    ? await supabase
        .from("reservations")
        .select("id, start_at, end_at, status")
        .in("id", reservationIds)
    : { data: [], error: null };
  if (reservations.error)
    throw new Error("Não foi possível carregar os horários das aulas.");
  return {
    coaches: coaches.data ?? [],
    classes: classes.data ?? [],
    students: students.data ?? [],
    customers: customers.data ?? [],
    courts: courts.data ?? [],
    profiles: profiles.data ?? [],
    reservations: reservations.data ?? [],
  };
}

export async function createCoach(input: {
  name: string;
  phone: string | null;
  email: string | null;
  specialties: string[];
  commissionType: CommissionType;
  commissionValue: number;
  profileId: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_coach", {
    p_name: input.name,
    p_phone: input.phone as string,
    p_email: input.email as string,
    p_specialties: input.specialties,
    p_commission_type: input.commissionType,
    p_commission_value: input.commissionValue,
    p_profile_id: input.profileId as string,
  });
  check(error, "Não foi possível cadastrar o professor.");
  return data;
}

export async function setCoachStatus(
  id: string,
  status: "active" | "inactive",
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_coach_status", {
    p_id: id,
    p_status: status,
  });
  check(error, "Não foi possível atualizar o professor.");
  return data;
}

export async function createClass(input: {
  coachId: string;
  courtId: string;
  kind: ClassKind;
  startAt: string;
  endAt: string;
  price: number;
  customerIds: string[];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_class", {
    p_coach_id: input.coachId,
    p_court_id: input.courtId,
    p_kind: input.kind,
    p_start_at: input.startAt,
    p_end_at: input.endAt,
    p_price: input.price,
    p_customer_ids: input.customerIds,
  });
  check(error, "Não foi possível agendar a aula.");
  return data;
}

export async function finishClass(id: string, presentCustomerIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_class", {
    p_id: id,
    p_present_customer_ids: presentCustomerIds,
  });
  check(error, "Não foi possível concluir a aula.");
  return data;
}

export async function cancelClass(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_class", { p_id: id });
  check(error, "Não foi possível cancelar a aula.");
  return data;
}
