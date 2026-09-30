import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { exportAuditLogs } from "@/features/audit/service";
import { auditReport } from "@/features/audit/reports";
import { parseAuditFilters } from "@/features/audit/validation";
import { getArenaTimezone } from "@/features/reservations/service";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const query = new URL(request.url).searchParams;
    const params = new URLSearchParams();
    for (const name of ["type", "from", "to"]) {
      const value = query.get(name);
      if (value !== null) params.set(name, value);
    }
    const filters = parseAuditFilters(params);
    const timezone = await getArenaTimezone(context);
    const items = await exportAuditLogs(context, filters, timezone);
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
