import { Temporal } from "@js-temporal/polyfill";
import { FinanceView } from "@/components/finance-view";
import { getArenaTimezone } from "@/features/reservations/service";
import { requireRole } from "@/lib/auth/context";

export default async function FinancePage() {
  const context = await requireRole(["OWNER", "MANAGER"]);
  const timezone = await getArenaTimezone(context);
  const today = Temporal.Now.zonedDateTimeISO(timezone).toPlainDate();
  return (
    <FinanceView
      initialMonth={today.toPlainYearMonth().toString()}
      today={today.toString()}
    />
  );
}
