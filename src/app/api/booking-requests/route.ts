import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { ValidationError } from "@/lib/api/validation-error";
import { createClient } from "@/lib/supabase/server";
import { parseBookingDecision } from "@/features/public-bookings/validation";

function decisionError(error: { message?: string; code?: string }) {
  const message = error.message ?? "";
  if (message.includes("EXPIRED"))
    return privateJson(
      { error: { message: "O horário deste pedido já passou." } },
      409,
    );
  if (message.includes("PRICE_CHANGED"))
    return privateJson(
      {
        error: {
          message:
            "O preço da quadra mudou. Peça ao cliente para enviar um novo pedido.",
        },
      },
      409,
    );
  if (message.includes("ALREADY_DECIDED"))
    return privateJson(
      { error: { message: "Este pedido já foi decidido." } },
      409,
    );
  if (error.code === "23P01")
    return privateJson(
      { error: { message: "O horário já está ocupado." } },
      409,
    );
  return null;
}

export async function PATCH(request: Request) {
  try {
    await requireRole(["OWNER"]);
    const input = parseBookingDecision(await request.json());
    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "decide_public_booking_request",
      {
        p_id: input.id,
        p_approve: input.approve,
        p_reason: input.reason,
      },
    );
    if (error) {
      const response = decisionError(error);
      if (response) return response;
      throw error;
    }
    return privateJson({ reservationId: data });
  } catch (error) {
    if (error instanceof ValidationError) return apiError(error);
    return apiError(error);
  }
}
