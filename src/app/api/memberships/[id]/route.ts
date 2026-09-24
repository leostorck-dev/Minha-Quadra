import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { cancel } from "@/features/memberships/service";
import { parseCancel, uuid } from "@/features/memberships/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;
    parseCancel(await request.json());
    return privateJson({ membership: await cancel(uuid(id)) });
  } catch (error) {
    return apiError(error);
  }
}
