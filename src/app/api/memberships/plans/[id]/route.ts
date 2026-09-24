import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { setPlanActive } from "@/features/memberships/service";
import { parsePlanStatus, uuid } from "@/features/memberships/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;
    const active = parsePlanStatus(await request.json());
    return privateJson({ plan: await setPlanActive(uuid(id), active) });
  } catch (error) {
    return apiError(error);
  }
}
