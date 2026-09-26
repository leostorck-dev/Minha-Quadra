import { Temporal } from "@js-temporal/polyfill";
import { TournamentsView } from "@/components/tournaments-view";
import { getArenaTimezone } from "@/features/reservations/service";
import { requireRole } from "@/lib/auth/context";

export default async function TournamentsPage() {
  const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
  const timezone = await getArenaTimezone(context);
  return (
    <TournamentsView
      role={context.role}
      today={Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString()}
    />
  );
}
