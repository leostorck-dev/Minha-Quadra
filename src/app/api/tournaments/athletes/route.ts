import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { searchAthletes } from "@/features/tournaments/service";
import { parseTournamentSearch } from "@/features/tournaments/pagination";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    return privateJson(
      await searchAthletes(
        context,
        parseTournamentSearch(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
