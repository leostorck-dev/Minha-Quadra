import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import {
  getPaymentDetails,
  refundPayment,
  registerPayment,
} from "@/features/payments/service";
import {
  parsePaymentCreate,
  parsePaymentRefund,
} from "@/features/payments/validation";

const PAYMENT_ROLES = ["OWNER", "MANAGER", "RECEPTIONIST"] as const;
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(PAYMENT_ROLES);
    return privateJson(await getPaymentDetails(context, (await params).id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const context = await requireRole(PAYMENT_ROLES);
    const { method } = parsePaymentCreate(await request.json());
    const payment = await registerPayment(context, (await params).id, method);
    return privateJson({ payment }, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const context = await requireRole(PAYMENT_ROLES);
    parsePaymentRefund(await request.json());
    const payment = await refundPayment(context, (await params).id);
    return privateJson({ payment });
  } catch (error) {
    return apiError(error);
  }
}
