import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { RESERVATION_WRITE_ROLES } from "@/features/reservations/permissions";
import {
  listReservations,
  getArenaTimezone,
} from "@/features/reservations/service";
import { parseReservationList } from "@/features/reservations/validation";
import { agendaReport } from "@/features/reservations/reports";

export async function GET(request: Request) {
  try {
    const context = await requireRole(RESERVATION_WRITE_ROLES);
    const options = parseReservationList(new URL(request.url).searchParams);
    const [{ items }, timezone] = await Promise.all([
      listReservations(context, options),
      getArenaTimezone(context),
    ]);
    return new Response(agendaReport(items, timezone), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="agenda.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
