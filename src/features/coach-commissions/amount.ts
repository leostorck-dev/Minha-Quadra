export function commissionAmount(
  price: number,
  type: string,
  value: number,
): number {
  if (type === "fixed") return Math.round(value * 100) / 100;
  const priceCents = Math.round(price * 100);
  const percentageBasisPoints = Math.round(value * 100);
  return Math.round((priceCents * percentageBasisPoints) / 10000) / 100;
}
