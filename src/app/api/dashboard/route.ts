import { getDashboardOverview } from "@/features/dashboard/service";
import { apiError, privateJson } from "@/lib/api/errors";
import { requireRole } from "@/lib/auth/context";

export async function GET() {
  try {
    const context = await requireRole([
      "OWNER",
      "MANAGER",
      "RECEPTIONIST",
      "COACH",
    ]);
    return privateJson(await getDashboardOverview(context));
  } catch (error) {
    return apiError(error);
  }
}
