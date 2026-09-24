import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  RESERVATION_READ_ROLES,
  RESERVATION_WRITE_ROLES,
} from "@/features/reservations/permissions";
import {
  createReservation,
  listReservations,
} from "@/features/reservations/service";
import {
  parseReservationCreate,
  parseReservationList,
} from "@/features/reservations/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(RESERVATION_READ_ROLES);
    const options = parseReservationList(new URL(request.url).searchParams);
    return privateJson(await listReservations(context, options));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRole(RESERVATION_WRITE_ROLES);
    const reservation = await createReservation(
      context,
      parseReservationCreate(await request.json()),
    );
    return privateJson({ reservation }, 201);
  } catch (error) {
    return apiError(error);
  }
}
