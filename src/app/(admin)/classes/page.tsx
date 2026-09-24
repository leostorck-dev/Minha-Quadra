import { ClassesView } from "@/components/classes-view";
import { Temporal } from "@js-temporal/polyfill";
import { getArenaTimezone } from "@/features/reservations/service";
import { requireRole } from "@/lib/auth/context";

export default async function ClassesPage() {
  const context = await requireRole([
    "OWNER",
    "MANAGER",
    "RECEPTIONIST",
    "COACH",
  ]);
  const timezone = await getArenaTimezone(context);
  return (
    <ClassesView
      timezone={timezone}
      role={context.role}
      today={Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString()}
      initialNow={Temporal.Now.instant().epochMilliseconds}
    />
  );
}
