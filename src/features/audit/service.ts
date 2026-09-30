import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { collectById } from "@/lib/database/pagination";
import { auditDateWindow, type AuditFilters } from "./validation";

type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type AuditExportRow = Pick<
  AuditRow,
  | "id"
  | "event"
  | "entity_type"
  | "entity_id"
  | "actor_id"
  | "actor_name"
  | "created_at"
>;

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
export type AuditExportLog = Omit<AuditLog, "details">;

function toAuditExportLog(row: AuditExportRow): AuditExportLog {
  return {
    id: row.id,
    event: row.event,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}

function toAuditLog(row: AuditRow): AuditLog {
  return {
    ...toAuditExportLog(row),
    details: row.details,
  };
}

export async function exportAuditLogs(
  context: AuthContext,
  filters: AuditFilters,
  timezone: string,
) {
  const supabase = await createClient();
  const window = auditDateWindow(filters, timezone);
  const rows = await collectById<AuditExportRow>((after) => {
    let query = supabase
      .from("audit_logs")
      .select(
        "id, event, entity_type, entity_id, actor_id, actor_name, created_at",
      )
      .eq("tenant_id", context.tenantId)
      .order("id", { ascending: true })
      .limit(200);
    if (filters.type !== "all") query = query.eq("entity_type", filters.type);
    if (window.start) query = query.gte("created_at", window.start);
    if (window.end) query = query.lt("created_at", window.end);
    if (after) query = query.gt("id", after);
    return query;
  }, "Não foi possível exportar a auditoria.");
  return rows
    .map(toAuditExportLog)
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id.localeCompare(a.id),
    );
}

export async function listAuditLogs(
  context: AuthContext,
  filters: AuditFilters,
  timezone: string,
) {
  const supabase = await createClient();
  const window = auditDateWindow(filters, timezone);
  const pageSize = 25;
  const from = (filters.page - 1) * pageSize;
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId);
  if (filters.type !== "all") query = query.eq("entity_type", filters.type);
  if (window.start) query = query.gte("created_at", window.start);
  if (window.end) query = query.lt("created_at", window.end);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error("Não foi possível carregar a auditoria.");
  return {
    items: ((data ?? []) as AuditRow[]).map(toAuditLog),
    total: count ?? 0,
    page: filters.page,
    pageSize,
  };
}
