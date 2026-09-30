import { ValidationError } from "@/lib/api/validation-error";
import {
  getPublicArena,
  PublicBookingError,
  submitPublicBooking,
} from "@/features/public-bookings/service";
import {
  parsePublicArenaSearch,
  parsePublicBookingRequest,
} from "@/features/public-bookings/validation";

function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return response({ error: { message: error.message } }, 400);
  }
  if (error instanceof PublicBookingError) {
    return response({ error: { message: error.message } }, error.status);
  }
  const errorId = crypto.randomUUID();
  console.error("Erro no pedido público", { errorId, error });
  return response(
    { error: { message: "Não foi possível concluir a operação.", errorId } },
    500,
  );
}

export async function GET(request: Request) {
  try {
    const { arenaSlug, courtId, selectedDate } = parsePublicArenaSearch(
      new URL(request.url).searchParams,
    );
    const arena = await getPublicArena(arenaSlug, courtId, selectedDate);
    if (!arena)
      return response({ error: { message: "Arena não encontrada." } }, 404);
    return response({ arena });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = parsePublicBookingRequest(await request.json());
    return response({ request: await submitPublicBooking(input) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
