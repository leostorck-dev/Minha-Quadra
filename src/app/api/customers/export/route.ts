import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { CUSTOMER_ROLES } from "@/features/customers/permissions";
import { exportCustomers } from "@/features/customers/service";
import { parseCustomerSearch } from "@/features/customers/validation";
import { customerReport } from "@/features/customers/reports";

export async function GET(request: Request) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const params = new URL(request.url).searchParams;
    const options = parseCustomerSearch(
      params.get("q"),
      null,
      params.get("status"),
      params.get("tag"),
      params.get("segment"),
    );
    const items = await exportCustomers(context, options);
    return new Response(customerReport(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="clientes.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
