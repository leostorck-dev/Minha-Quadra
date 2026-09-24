import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  createFinancialTransaction,
  listFinancialTransactions,
} from "@/features/finance/service";
import {
  parseFinanceCreate,
  parseFinanceList,
} from "@/features/finance/validation";

const MANAGEMENT_ROLES = ["OWNER", "MANAGER"] as const;

export async function GET(request: Request) {
  try {
    const context = await requireRole(MANAGEMENT_ROLES);
    const options = parseFinanceList(new URL(request.url).searchParams);
    return privateJson(await listFinancialTransactions(context, options));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRole(MANAGEMENT_ROLES);
    const input = parseFinanceCreate(await request.json());
    return privateJson(
      { transaction: await createFinancialTransaction(context, input) },
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
