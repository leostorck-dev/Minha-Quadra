import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { advanceFinancialTransaction } from "@/features/finance/service";
import { parseFinanceUpdate } from "@/features/finance/validation";

const MANAGEMENT_ROLES = ["OWNER", "MANAGER"] as const;
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const context = await requireRole(MANAGEMENT_ROLES);
    const { status } = parseFinanceUpdate(await request.json());
    const transaction = await advanceFinancialTransaction(
      context,
      (await params).id,
      status,
    );
    return privateJson({ transaction });
  } catch (error) {
    return apiError(error);
  }
}
