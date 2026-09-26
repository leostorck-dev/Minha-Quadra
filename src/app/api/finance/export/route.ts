import { requireRole } from "@/lib/auth/context";
import { apiError } from "@/lib/api/errors";
import { exportFinancialTransactions } from "@/features/finance/service";
import {
  parseFinanceList,
  parseFinanceReport,
} from "@/features/finance/validation";
import {
  financeReport,
  financeCategoryReport,
} from "@/features/finance/reports";

export async function GET(request: Request) {
  try {
    const context = await requireRole(["OWNER", "MANAGER"]);
    const params = new URL(request.url).searchParams;
    const options = parseFinanceList(params);
    const report = parseFinanceReport(params);
    const items = await exportFinancialTransactions(context, options);
    return new Response(
      report === "categories"
        ? financeCategoryReport(items)
        : financeReport(items),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="financeiro-${report === "categories" ? "categorias-" : ""}${options.scope === "overdue" ? "contas-vencidas" : options.scope === "upcoming" ? "proximos-7-dias" : `${options.month}-${options.type}-${options.status}`}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
