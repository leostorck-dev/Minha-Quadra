import { getArenaTimezone } from "@/features/reservations/service";
import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export type DashboardOverview = {
  today: string;
  timezone: string;
  bookingsToday: number;
  activeCustomers: number;
  occupancyPercent: number;
  upcoming: {
    id: string;
    courtName: string;
    customerName: string;
    startAt: string;
    status: string;
  }[];
  financial: null | {
    todayIncome: number;
    monthIncome: number;
    averageTicket: number;
    revenueSeries: { month: string; income: number }[];
  };
};

export async function getDashboardOverview(
  context: AuthContext,
): Promise<DashboardOverview> {
  const supabase = await createClient();
  const [{ data, error }, timezone] = await Promise.all([
    supabase.rpc("dashboard_overview"),
    getArenaTimezone(context),
  ]);
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Não foi possível carregar o painel.");
  }
  return { ...(data as Omit<DashboardOverview, "timezone">), timezone };
}
