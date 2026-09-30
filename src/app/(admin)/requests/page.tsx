import { redirect } from "next/navigation";
import { BookingRequestsView } from "@/components/booking-requests-view";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function RequestsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "OWNER") redirect("/dashboard");

  const supabase = await createClient();
  const [requestResult, tenantResult] = await Promise.all([
    supabase
      .from("public_booking_requests")
      .select(
        "id, player_name, player_phone, start_at, end_at, price, status, decline_reason, reservation_id, decided_at, created_at, courts(name)",
      )
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tenants")
      .select("timezone")
      .eq("id", context.tenantId)
      .single(),
  ]);
  if (requestResult.error || tenantResult.error || !tenantResult.data)
    throw new Error("Não foi possível carregar as solicitações.");

  return (
    <BookingRequestsView
      timezone={tenantResult.data.timezone}
      requests={(requestResult.data ?? []).map((item) => ({
        id: item.id,
        playerName: item.player_name,
        playerPhone: item.player_phone,
        startAt: item.start_at,
        endAt: item.end_at,
        price: item.price,
        status: item.status,
        declineReason: item.decline_reason,
        reservationId: item.reservation_id,
        decidedAt: item.decided_at,
        createdAt: item.created_at,
        courtName: item.courts?.name ?? "Quadra",
      }))}
    />
  );
}
