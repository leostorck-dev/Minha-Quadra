import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { ValidationError } from "@/lib/api/validation-error";
import { uuid } from "@/features/classes/validation";
import {
  getCoachCommissionDetails,
  registerCoachCommission,
  type CoachPayoutMethod,
} from "@/features/coach-commissions/service";

type Context = { params: Promise<{ id: string }> };
const PAYOUT_METHODS = ["pix", "cash", "transfer"] as const;

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(["OWNER", "MANAGER", "COACH"]);
    return privateJson(
      await getCoachCommissionDetails(context, uuid((await params).id)),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    await requireRole(["OWNER", "MANAGER"]);
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => key !== "method") ||
      !PAYOUT_METHODS.includes(
        (body as { method?: CoachPayoutMethod }).method as CoachPayoutMethod,
      )
    ) {
      throw new ValidationError("Selecione uma forma de pagamento válida.");
    }
    const method = (body as { method: CoachPayoutMethod }).method;
    const payout = await registerCoachCommission(
      uuid((await params).id),
      method,
    );
    return privateJson({ payout }, 201);
  } catch (error) {
    return apiError(error);
  }
}
