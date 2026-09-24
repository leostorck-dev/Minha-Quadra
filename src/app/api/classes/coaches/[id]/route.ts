import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { setCoachStatus } from "@/features/classes/service";
import { parseCoachStatus, uuid } from "@/features/classes/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const { id } = await params;
    return privateJson({
      coach: await setCoachStatus(
        uuid(id),
        parseCoachStatus(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
