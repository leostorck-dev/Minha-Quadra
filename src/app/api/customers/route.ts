import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { CUSTOMER_ROLES } from "@/features/customers/permissions";
import { createCustomer, listCustomers } from "@/features/customers/service";
import {
  parseCustomerCreate,
  parseCustomerSearch,
} from "@/features/customers/validation";

export async function GET(request: Request) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const params = new URL(request.url).searchParams;
    const options = parseCustomerSearch(
      params.get("q"),
      params.get("page"),
      params.get("status"),
      params.get("tag"),
      params.get("segment"),
    );
    return privateJson(await listCustomers(context, options));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireRole(CUSTOMER_ROLES);
    const input = parseCustomerCreate(await request.json());
    const customer = await createCustomer(context, input);
    return privateJson({ customer }, 201);
  } catch (error) {
    return apiError(error);
  }
}
