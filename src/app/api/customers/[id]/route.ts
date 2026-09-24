import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { CUSTOMER_ROLES } from "@/features/customers/permissions";
import {
  deactivateCustomer,
  getCustomer,
  updateCustomer,
} from "@/features/customers/service";
import { parseCustomerUpdate } from "@/features/customers/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const { id } = await params;
    return privateJson({ customer: await getCustomer(context, id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const { id } = await params;
    const input = parseCustomerUpdate(await request.json());
    return privateJson({ customer: await updateCustomer(context, id, input) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const { id } = await params;
    await deactivateCustomer(context, id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
