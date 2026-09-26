import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { resolveTie, tiebreakHistory } from "@/features/tournaments/service";
import { parseTiebreak, uuid } from "@/features/tournaments/validation";
type Context = { params: Promise<{ id: string; groupId: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id, groupId } = await params;
    return privateJson(
      {
        decision: await resolveTie(
          uuid(id),
          uuid(groupId),
          parseTiebreak(await request.json()),
        ),
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const { id, groupId } = await params;
    return privateJson({
      history: await tiebreakHistory(context, uuid(id), uuid(groupId)),
    });
  } catch (error) {
    return apiError(error);
  }
}
