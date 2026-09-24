import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createPlan } from "@/features/memberships/service";
import { parsePlan } from "@/features/memberships/validation";

export async function POST(request: Request) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { name, monthlyPrice, classesPerMonth } = parsePlan(
      await request.json(),
    );
    return privateJson(
      { plan: await createPlan(name, monthlyPrice, classesPerMonth) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
