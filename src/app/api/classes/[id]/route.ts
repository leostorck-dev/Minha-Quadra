import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { cancelClass, finishClass } from "@/features/classes/service";
import { parseClassChange, uuid } from "@/features/classes/validation";
import { ForbiddenError } from "@/lib/auth/context";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireRole([
      "OWNER",
      "MANAGER",
      "RECEPTIONIST",
      "COACH",
    ]);
    const { id } = await params;
    const change = parseClassChange(await request.json());
    if (change.status === "cancelled") {
      if (context.role === "COACH") throw new ForbiddenError();
      return privateJson({ classSession: await cancelClass(uuid(id)) });
    }
    return privateJson({
      classSession: await finishClass(uuid(id), change.presentCustomerIds),
    });
  } catch (error) {
    return apiError(error);
  }
}
