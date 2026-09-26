import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { exportMembershipPayments } from "@/features/memberships/service";
import { parsePaymentSearch } from "@/features/memberships/validation";
import { membershipPaymentReport } from "@/features/memberships/reports";
export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const params = new URL(request.url).searchParams;
    params.delete("page");
    const options = parsePaymentSearch(params);
    const items = await exportMembershipPayments(context, options);
    return new Response(membershipPaymentReport(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="mensalidades-pagamentos.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
