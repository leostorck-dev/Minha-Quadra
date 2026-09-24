import { listAuditLogs } from "@/features/audit/service";
import { parseAuditFilters } from "@/features/audit/validation";
import { apiError, privateJson } from "@/lib/api/errors";
import { requireRole } from "@/lib/auth/context";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const filters = parseAuditFilters(new URL(request.url).searchParams);
    return privateJson(await listAuditLogs(context, filters));
  } catch (error) {
    return apiError(error);
  }
}
