import { Temporal } from "@js-temporal/polyfill";
import { MembershipsView } from "@/components/memberships-view";
import { getArenaTimezone } from "@/features/reservations/service";
import { requireRole } from "@/lib/auth/context";

export default async function MembershipsPage() {
  const context = await requireRole(["OWNER", "MANAGER"]);
  const timezone = await getArenaTimezone(context);
  return (
    <MembershipsView
      today={Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString()}
    />
  );
}
