import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { exportFinancialTransactions } from "@/features/finance/service";
import { parseFinanceList } from "@/features/finance/validation";
import { financeReport } from "@/features/finance/reports";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const options = parseFinanceList(new URL(request.url).searchParams);
    const items = await exportFinancialTransactions(context, options);
    return new Response(financeReport(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="financeiro-${options.month}-${options.type}-${options.status}.csv"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
