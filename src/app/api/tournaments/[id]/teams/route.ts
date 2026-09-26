import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { registerTeam } from "@/features/tournaments/service";
import { parseTeam, uuid } from "@/features/tournaments/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    const { categoryId, customerIds } = parseTeam(await request.json());
    const team = await registerTeam(
      uuid((await params).id),
      categoryId,
      customerIds,
    );
    return privateJson({ team }, 201);
  } catch (error) {
    return apiError(error);
  }
}
