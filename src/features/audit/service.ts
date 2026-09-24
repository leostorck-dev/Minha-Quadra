import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { AuditFilters } from "./validation";

type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type AuditLog = {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName: string;
  details: AuditRow["details"];
  createdAt: string;
};

export async function listAuditLogs(
  context: AuthContext,
  filters: AuditFilters,
) {
  const supabase = await createClient();
  const pageSize = 25;
  const from = (filters.page - 1) * pageSize;
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId);
  if (filters.type !== "all") query = query.eq("entity_type", filters.type);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error("Não foi possível carregar a auditoria.");
  return {
    items: ((data ?? []) as AuditRow[]).map((row): AuditLog => ({
      id: row.id,
      event: row.event,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      details: row.details,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
    page: filters.page,
    pageSize,
  };
}
