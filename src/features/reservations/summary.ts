import type { Reservation } from "./service";

export function summarizeAgenda(
  items: Reservation[],
  from: string,
  to: string,
) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  let bookings = 0;
  let blocks = 0;
  let minutes = 0;
  let pendingCents = 0;
  for (const item of items) {
    if (item.status === "cancelled" || item.status === "no_show") continue;
    const overlap =
      Math.min(Date.parse(item.endAt), end) -
      Math.max(Date.parse(item.startAt), start);
    if (overlap <= 0) continue;
    minutes += overlap / 60_000;
    if (item.kind === "block") {
      blocks += 1;
    } else {
      bookings += 1;
      if (item.paymentSituation === "pending")
        pendingCents += Math.round(item.price * 100);
    }
  }
  return { bookings, blocks, minutes, pendingCents };
}
