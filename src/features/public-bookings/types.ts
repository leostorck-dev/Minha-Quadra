import type { Json } from "@/types/database";

export type PublicCourt = {
  id: string;
  name: string;
  sport: string;
  price: number;
  openingTime: string;
  closingTime: string;
};

export type PublicSlot = { startAt: string; endAt: string };

export type PublicArena = {
  name: string;
  slug: string;
  timezone: string;
  today: string;
  maxDate: string;
  date: string | null;
  courtId: string | null;
  courts: PublicCourt[];
  slots: PublicSlot[];
};

export type PublicBrand = {
  name: string;
  slug: string;
  whatsapp: string | null;
  address: string | null;
  playerInstructions: string | null;
  logoUpdatedAt: string | null;
};

export type PublicRequestStatus = {
  id: string;
  arena: string;
  court: string;
  startAt: string;
  endAt: string;
  price: number;
  timezone: string;
  status: "pending" | "approved" | "declined" | "expired";
  reservationStatus: string | null;
  declineReason: string | null;
};

function object(value: Json): Record<string, Json | undefined> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function text(value: Json | undefined) {
  return typeof value === "string" ? value : null;
}

function number(value: Json | undefined) {
  return typeof value === "number" ? value : null;
}

export function asPublicArena(value: Json): PublicArena | null {
  const data = object(value);
  if (!data || !Array.isArray(data.courts) || !Array.isArray(data.slots))
    return null;
  const name = text(data.name);
  const arenaSlug = text(data.slug);
  const timezone = text(data.timezone);
  const today = text(data.today);
  const maxDate = text(data.maxDate);
  if (!name || !arenaSlug || !timezone || !today || !maxDate) return null;

  const courts = data.courts.flatMap((entry) => {
    const court = object(entry);
    if (!court) return [];
    const id = text(court.id);
    const courtName = text(court.name);
    const sport = text(court.sport);
    const price = number(court.price);
    const openingTime = text(court.openingTime);
    const closingTime = text(court.closingTime);
    return id &&
      courtName &&
      sport &&
      price !== null &&
      openingTime &&
      closingTime
      ? [{ id, name: courtName, sport, price, openingTime, closingTime }]
      : [];
  });

  const slots = data.slots.flatMap((entry) => {
    const slot = object(entry);
    const startAt = slot && text(slot.startAt);
    const endAt = slot && text(slot.endAt);
    return startAt && endAt ? [{ startAt, endAt }] : [];
  });

  return {
    name,
    slug: arenaSlug,
    timezone,
    today,
    maxDate,
    date: text(data.date),
    courtId: text(data.courtId),
    courts,
    slots,
  };
}

export function asPublicBrand(value: Json): PublicBrand | null {
  const data = object(value);
  if (!data) return null;
  const name = text(data.name);
  const arenaSlug = text(data.slug);
  if (!name || !arenaSlug) return null;
  return {
    name,
    slug: arenaSlug,
    whatsapp: text(data.whatsapp),
    address: text(data.address),
    playerInstructions: text(data.playerInstructions),
    logoUpdatedAt: text(data.logoUpdatedAt),
  };
}

export function asPublicRequestStatus(value: Json): PublicRequestStatus | null {
  const data = object(value);
  if (!data) return null;
  const id = text(data.id);
  const arena = text(data.arena);
  const court = text(data.court);
  const startAt = text(data.startAt);
  const endAt = text(data.endAt);
  const price = number(data.price);
  const timezone = text(data.timezone);
  const status = text(data.status);
  if (
    !id ||
    !arena ||
    !court ||
    !startAt ||
    !endAt ||
    price === null ||
    !timezone ||
    !status ||
    !["pending", "approved", "declined", "expired"].includes(status)
  )
    return null;
  return {
    id,
    arena,
    court,
    startAt,
    endAt,
    price,
    timezone,
    status: status as PublicRequestStatus["status"],
    reservationStatus: text(data.reservationStatus),
    declineReason: text(data.declineReason),
  };
}
