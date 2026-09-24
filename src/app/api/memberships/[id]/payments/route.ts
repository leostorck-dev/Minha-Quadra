import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { pay } from "@/features/memberships/service";
import { parseMethod, uuid } from "@/features/memberships/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const { id } = await params;
    const method = parseMethod(await request.json());
    return privateJson({ payment: await pay(uuid(id), method) }, 201);
  } catch (error) {
    return apiError(error);
  }
}
