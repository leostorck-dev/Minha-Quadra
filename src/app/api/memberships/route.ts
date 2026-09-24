import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { enroll, overview } from "@/features/memberships/service";
import { parseEnrollment } from "@/features/memberships/validation";

export async function GET() {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    return privateJson(await overview(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { customerId, planId, startOn } = parseEnrollment(
      await request.json(),
    );
    return privateJson(
      { membership: await enroll(customerId, planId, startOn) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
