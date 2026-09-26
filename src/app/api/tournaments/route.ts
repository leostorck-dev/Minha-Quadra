import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createTournament, overview } from "@/features/tournaments/service";
import { parseTournament } from "@/features/tournaments/validation";

export async function GET() {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    return privateJson(await overview(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const tournament = await createTournament(
      parseTournament(await request.json()),
    );
    return privateJson({ tournament }, 201);
  } catch (error) {
    return apiError(error);
  }
}
