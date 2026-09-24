import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createCoach } from "@/features/classes/service";
import { parseCoach } from "@/features/classes/validation";

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    return privateJson(
      { coach: await createCoach(parseCoach(await request.json())) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
