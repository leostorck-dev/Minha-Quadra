import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { asPublicArena, asPublicBrand, asPublicRequestStatus } from "./types";

export class PublicBookingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "PublicBookingError";
  }
}

function publicError(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? "";
  if (error?.code === "23P01" || message.includes("SLOT_TAKEN"))
    return new PublicBookingError(
      "Este horário acabou de ser ocupado. Escolha outro.",
      409,
    );
  if (message.includes("RATE_LIMITED"))
    return new PublicBookingError(
      "Muitos pedidos foram enviados. Tente novamente mais tarde.",
      429,
    );
  if (error?.code === "P0002" || message.includes("NOT_FOUND"))
    return new PublicBookingError("Arena ou horário não encontrado.", 404);
  if (message.includes("RETRY_MISMATCH"))
    return new PublicBookingError(
      "O pedido não corresponde à tentativa anterior.",
      409,
    );
  return new PublicBookingError("Não foi possível concluir o pedido.");
}

export async function getPublicArena(
  arenaSlug: string,
  courtId: string | null = null,
  selectedDate: string | null = null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_arena", {
    p_slug: arenaSlug,
    ...(courtId ? { p_court: courtId } : {}),
    ...(selectedDate ? { p_date: selectedDate } : {}),
  });
  if (error) throw publicError(error);
  return data ? asPublicArena(data as Json) : null;
}

export async function getPublicBrand(arenaSlug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_arena_brand", {
    p_slug: arenaSlug,
  });
  if (error) throw publicError(error);
  return data ? asPublicBrand(data as Json) : null;
}

export async function submitPublicBooking(input: {
  arenaSlug: string;
  courtId: string;
  startAt: string;
  name: string;
  phone: string;
  token: string;
  website: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_public_booking_request", {
    p_slug: input.arenaSlug,
    p_court: input.courtId,
    p_start: input.startAt,
    p_name: input.name,
    p_phone: input.phone,
    p_token: input.token,
    p_website: input.website,
  });
  if (error) throw publicError(error);
  const status = data ? asPublicRequestStatus(data as Json) : null;
  if (!status)
    throw new PublicBookingError("Não foi possível confirmar o envio.", 500);
  return status;
}

export async function getPublicBookingStatus(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_booking_request_status", {
    p_token: token,
  });
  if (error) throw publicError(error);
  return data ? asPublicRequestStatus(data as Json) : null;
}
