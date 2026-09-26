import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { setTournamentStatus } from "@/features/tournaments/service";
import { parseTournamentStatus, uuid } from "@/features/tournaments/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const status = parseTournamentStatus(await request.json());
    const tournament = await setTournamentStatus(
      uuid((await params).id),
      status,
    );
    return privateJson({ tournament });
  } catch (error) {
    return apiError(error);
  }
}
