import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { listMembershipPayments } from "@/features/memberships/service";
import { parsePaymentSearch } from "@/features/memberships/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    return privateJson(
      await listMembershipPayments(
        context,
        parsePaymentSearch(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
