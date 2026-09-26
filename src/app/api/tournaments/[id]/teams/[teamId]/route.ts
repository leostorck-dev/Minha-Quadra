import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { withdrawTeam } from "@/features/tournaments/service";
import { parseWithdraw, uuid } from "@/features/tournaments/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    parseWithdraw(await request.json());
    const { id, teamId } = await params;
    const team = await withdrawTeam(uuid(id), uuid(teamId));
    return privateJson({ team });
  } catch (error) {
    return apiError(error);
  }
}
