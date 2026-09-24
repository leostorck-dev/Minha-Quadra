import { AgendaView } from "@/components/agenda-view";
import { listCourts } from "@/features/courts/service";
import { RESERVATION_READ_ROLES } from "@/features/reservations/permissions";
import { getArenaTimezone } from "@/features/reservations/service";
import { requireRole } from "@/lib/auth/context";

export default async function AgendaPage() {
  const context = await requireRole(RESERVATION_READ_ROLES);
  const [courts, timezone] = await Promise.all([
    listCourts(context, { query: "", status: "all" }),
    getArenaTimezone(context),
  ]);
  return (
    <AgendaView
      courts={courts.items}
      timezone={timezone}
      canWrite={context.role !== "COACH"}
    />
  );
}
