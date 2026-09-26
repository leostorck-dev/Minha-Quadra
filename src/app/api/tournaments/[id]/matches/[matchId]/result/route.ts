import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { recordResult, resultHistory } from "@/features/tournaments/service";
import { parseResult, uuid } from "@/features/tournaments/validation";
type Context = { params: Promise<{ id: string; matchId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id, matchId } = await params;
    return privateJson({
      match: await recordResult(
        uuid(id),
        uuid(matchId),
        parseResult(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const { id, matchId } = await params;
    return privateJson({
      history: await resultHistory(context, uuid(id), uuid(matchId)),
    });
  } catch (error) {
    return apiError(error);
  }
}
