import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { CUSTOMER_ROLES } from "@/features/customers/permissions";
import { listCustomerReservationHistory } from "@/features/customers/reservation-history";
import { parseHistoryPage } from "@/features/customers/reservation-history-validation";
import { getArenaTimezone } from "@/features/reservations/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const { id } = await params;
    const page = parseHistoryPage(
      new URL(request.url).searchParams.get("page"),
    );
    const [history, timezone] = await Promise.all([
      listCustomerReservationHistory(context, id, page),
      getArenaTimezone(context),
    ]);
    return privateJson({ ...history, timezone });
  } catch (error) {
    return apiError(error);
  }
}
