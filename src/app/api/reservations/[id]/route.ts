import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  RESERVATION_READ_ROLES,
  RESERVATION_WRITE_ROLES,
} from "@/features/reservations/permissions";
import {
  cancelReservation,
  getReservation,
  updateReservation,
} from "@/features/reservations/service";
import { parseReservationUpdate } from "@/features/reservations/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(RESERVATION_READ_ROLES);
    return privateJson({
      reservation: await getReservation(context, (await params).id),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const context = await requireRole(RESERVATION_WRITE_ROLES);
    const reservation = await updateReservation(
      context,
      (await params).id,
      parseReservationUpdate(await request.json()),
    );
    return privateJson({ reservation });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(RESERVATION_WRITE_ROLES);
    await cancelReservation(context, (await params).id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
