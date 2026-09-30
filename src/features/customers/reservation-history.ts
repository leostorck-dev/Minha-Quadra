import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ReservationStatus } from "@/features/reservations/validation";
import {
  derivePaymentSituation,
  type PaymentSituation,
} from "@/features/reservations/payment-situation";
import { getCustomer } from "./service";

type ReservationRow = Database["public"]["Tables"]["reservations"]["Row"];
type HistoryRow = Pick<
  ReservationRow,
  "id" | "start_at" | "end_at" | "status" | "price"
> & {
  courts: { name: string } | null;
};

export type CustomerReservationHistoryItem = {
  id: string;
  startAt: string;
  endAt: string;
  courtName: string;
  status: ReservationStatus;
  price: number;
  paymentSituation: PaymentSituation;
};

export async function listCustomerReservationHistory(
  context: AuthContext,
  customerId: string,
  page: number,
) {
  await getCustomer(context, customerId);
  const supabase = await createClient();
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("reservations")
    .select("id, start_at, end_at, status, price, courts(name)", {
      count: "exact",
    })
    .eq("tenant_id", context.tenantId)
    .eq("customer_id", customerId)
    .eq("kind", "booking")
    .order("start_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (error || !data)
    throw new Error("Não foi possível carregar as reservas do cliente.");
  const rows = data as HistoryRow[];
  const paymentByReservation = new Map<string, "paid" | "refunded">();
  if (rows.length > 0) {
    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select("reservation_id, status")
      .eq("tenant_id", context.tenantId)
      .in(
        "reservation_id",
        rows.map((row) => row.id),
      );
    if (paymentError || !payments)
      throw new Error("Não foi possível carregar as cobranças do cliente.");
    for (const payment of payments)
      paymentByReservation.set(
        payment.reservation_id,
        payment.status as "paid" | "refunded",
      );
  }
  return {
    items: rows.map((row): CustomerReservationHistoryItem => ({
      id: row.id,
      startAt: row.start_at,
      endAt: row.end_at,
      courtName: row.courts?.name ?? "Quadra",
      status: row.status,
      price: row.price,
      paymentSituation: derivePaymentSituation(
        row.status,
        row.price,
        paymentByReservation.get(row.id) ?? null,
      ),
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}
