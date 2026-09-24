import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createClass, overview } from "@/features/classes/service";
import { parseClass } from "@/features/classes/validation";

export async function GET() {
  try {
    const context = await requireRole([
      "OWNER",
      "MANAGER",
      "RECEPTIONIST",
      "COACH",
    ]);
    return privateJson(await overview(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    return privateJson(
      { classSession: await createClass(parseClass(await request.json())) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
