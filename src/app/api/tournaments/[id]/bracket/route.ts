import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { createBracket } from "@/features/tournaments/service";
import { parseBracket, uuid } from "@/features/tournaments/validation";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const input = parseBracket(await request.json());
    return privateJson(
      {
        qualifiers: await createBracket(
          uuid((await params).id),
          input.categoryId,
          input.qualifiers,
        ),
      },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
