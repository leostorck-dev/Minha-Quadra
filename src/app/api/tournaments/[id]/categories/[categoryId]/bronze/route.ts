import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createBronze } from "@/features/tournaments/service";
import { uuid } from "@/features/tournaments/validation";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id, categoryId } = await params;
    return privateJson(
      { match: await createBronze(uuid(id), uuid(categoryId)) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
