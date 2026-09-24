import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { RESERVATION_READ_ROLES } from "@/features/reservations/permissions";
import { getAvailability } from "@/features/reservations/service";
import { parseAvailability } from "@/features/reservations/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(RESERVATION_READ_ROLES);
    const { courtId, date } = parseAvailability(
      new URL(request.url).searchParams,
    );
    return privateJson(await getAvailability(context, courtId, date));
  } catch (error) {
    return apiError(error);
  }
}
