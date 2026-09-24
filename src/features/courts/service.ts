import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  assertCourtHours,
  type CourtFields,
  type CourtStatus,
  type CourtUpdate,
} from "./validation";

type CourtRow = Database["public"]["Tables"]["courts"]["Row"];

export type Court = {
  id: string;
  name: string;
  description: string | null;
  sport: string;
  pricePerHour: number;
  status: CourtStatus;
  openingTime: string;
  closingTime: string;
  createdAt: string;
  updatedAt: string;
};

export class CourtNotFoundError extends Error {
  constructor() {
    super("Quadra não encontrada.");
    this.name = "CourtNotFoundError";
  }
}

function toCourt(row: CourtRow): Court {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sport: row.sport,
    pricePerHour: row.price_per_hour,
    status: row.status as CourtStatus,
    openingTime: row.opening_time.slice(0, 5),
    closingTime: row.closing_time.slice(0, 5),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function listCourts(
  context: AuthContext,
  options: { query: string; status: CourtStatus | "all" },
) {
  const supabase = await createClient();
  let query = supabase
    .from("courts")
    .select("*")
    .eq("tenant_id", context.tenantId);
  if (options.status !== "all") query = query.eq("status", options.status);
  if (options.query) query = query.ilike("name", `%${options.query}%`);
  const { data, error } = await query.order("name", { ascending: true });
  if (error) throw new Error("Não foi possível listar as quadras.");
  return { items: (data ?? []).map(toCourt) };
}

export async function getCourt(context: AuthContext, id: string) {
  if (!isUuid(id)) throw new CourtNotFoundError();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a quadra.");
  if (!data) throw new CourtNotFoundError();
  return toCourt(data);
}

export async function createCourt(context: AuthContext, input: CourtFields) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .insert({
      tenant_id: context.tenantId,
      created_by: context.userId,
      name: input.name,
      sport: input.sport,
      description: input.description,
      price_per_hour: input.pricePerHour,
      opening_time: input.openingTime,
      closing_time: input.closingTime,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error("Não foi possível criar a quadra.");
  return toCourt(data);
}

export async function updateCourt(
  context: AuthContext,
  id: string,
  input: CourtUpdate,
) {
  const existing = await getCourt(context, id);
  const opening = input.openingTime ?? existing.openingTime;
  const closing = input.closingTime ?? existing.closingTime;
  assertCourtHours(opening, closing);

  const updates: Database["public"]["Tables"]["courts"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if ("name" in input) updates.name = input.name;
  if ("sport" in input) updates.sport = input.sport;
  if ("description" in input) updates.description = input.description;
  if ("pricePerHour" in input) updates.price_per_hour = input.pricePerHour;
  if ("openingTime" in input) updates.opening_time = input.openingTime;
  if ("closingTime" in input) updates.closing_time = input.closingTime;
  if ("status" in input) updates.status = input.status;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .update(updates)
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error("Não foi possível atualizar a quadra.");
  if (!data) throw new CourtNotFoundError();
  return toCourt(data);
}

export async function deactivateCourt(context: AuthContext, id: string) {
  await getCourt(context, id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível desativar a quadra.");
  if (!data) throw new CourtNotFoundError();
}
