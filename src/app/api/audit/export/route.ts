import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { exportAuditLogs } from "@/features/audit/service";
import { auditReport } from "@/features/audit/reports";
import { parseAuditFilters } from "@/features/audit/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const type = new URL(request.url).searchParams.get("type") ?? "all";
    const filters = parseAuditFilters(new URLSearchParams({ type }));
    const items = await exportAuditLogs(context, filters.type);
    return new Response(auditReport(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="auditoria.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
