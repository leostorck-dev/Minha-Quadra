import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  COURT_READ_ROLES,
  COURT_WRITE_ROLES,
} from "@/features/courts/permissions";
import {
  deactivateCourt,
  getCourt,
  updateCourt,
} from "@/features/courts/service";
import { parseCourtUpdate } from "@/features/courts/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(COURT_READ_ROLES);
    const { id } = await params;
    return privateJson({ court: await getCourt(context, id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const context = await requireRole(COURT_WRITE_ROLES);
    const { id } = await params;
    return privateJson({
      court: await updateCourt(
        context,
        id,
        parseCourtUpdate(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(COURT_WRITE_ROLES);
    const { id } = await params;
    await deactivateCourt(context, id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
