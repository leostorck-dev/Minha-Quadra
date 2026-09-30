import { ValidationError } from "@/lib/api/validation-error";
import {
  getPublicBookingStatus,
  PublicBookingError,
} from "@/features/public-bookings/service";
import { parseStatusToken } from "@/features/public-bookings/validation";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  try {
    const token = parseStatusToken(
      new URL(request.url).searchParams.get("token"),
    );
    const status = await getPublicBookingStatus(token);
    if (!status)
      return response({ error: { message: "Pedido não encontrado." } }, 404);
    return response({ request: status });
  } catch (error) {
    if (error instanceof ValidationError)
      return response({ error: { message: error.message } }, 400);
    if (error instanceof PublicBookingError)
      return response({ error: { message: error.message } }, error.status);
    const errorId = crypto.randomUUID();
    console.error("Erro ao consultar pedido público", { errorId, error });
    return response(
      { error: { message: "Não foi possível consultar o pedido.", errorId } },
      500,
    );
  }
}
