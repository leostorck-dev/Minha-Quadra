import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { drawCategory, getDraw } from "@/features/tournaments/service";
import { parseDraw, uuid } from "@/features/tournaments/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "RECEPTIONIST"]);
    return privateJson(await getDraw(context, uuid((await params).id)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const input = parseDraw(await request.json());
    const groupCount = await drawCategory(
      uuid((await params).id),
      input.categoryId,
      input.groupSize,
    );
    return privateJson({ groupCount }, 201);
  } catch (error) {
    return apiError(error);
  }
}
