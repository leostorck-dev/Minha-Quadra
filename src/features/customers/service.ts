import type { AuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  ValidationError,
  type CustomerCreateInput,
  type CustomerStatus,
  type CustomerUpdateInput,
} from "./validation";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  notes: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
};

export class CustomerNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado.");
    this.name = "CustomerNotFoundError";
  }
}

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthDate: row.birth_date,
    notes: row.notes,
    status: row.status as CustomerStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function listCustomers(
  context: AuthContext,
  options: { query: string; page: number; status: CustomerStatus | "all" },
) {
  const supabase = await createClient();
  const pageSize = 20;
  const from = (options.page - 1) * pageSize;
  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("tenant_id", context.tenantId);

  if (options.status !== "all") query = query.eq("status", options.status);
  if (options.query) query = query.ilike("name", `%${options.query}%`);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw new Error("Não foi possível listar os clientes.");

  return {
    items: (data ?? []).map(toCustomer),
    total: count ?? 0,
    page: options.page,
    pageSize,
  };
}

export async function getCustomer(context: AuthContext, id: string) {
  if (!isUuid(id)) throw new CustomerNotFoundError();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar o cliente.");
  if (!data) throw new CustomerNotFoundError();
  return toCustomer(data);
}

export async function createCustomer(
  context: AuthContext,
  input: CustomerCreateInput,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: context.tenantId,
      created_by: context.userId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      birth_date: input.birthDate,
      notes: input.notes,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("Não foi possível criar o cliente.");
  return toCustomer(data);
}

export async function updateCustomer(
  context: AuthContext,
  id: string,
  input: CustomerUpdateInput,
) {
  const existing = await getCustomer(context, id);
  const phone = "phone" in input ? input.phone : existing.phone;
  const email = "email" in input ? input.email : existing.email;
  if (!phone && !email) {
    throw new ValidationError("Informe telefone ou email.");
  }

  const updates: Database["public"]["Tables"]["customers"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if ("name" in input) updates.name = input.name;
  if ("phone" in input) updates.phone = input.phone;
  if ("email" in input) updates.email = input.email;
  if ("birthDate" in input) updates.birth_date = input.birthDate;
  if ("notes" in input) updates.notes = input.notes;
  if ("status" in input) updates.status = input.status;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error("Não foi possível atualizar o cliente.");
  if (!data) throw new CustomerNotFoundError();
  return toCustomer(data);
}

export async function deactivateCustomer(context: AuthContext, id: string) {
  await getCustomer(context, id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("tenant_id", context.tenantId)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("Não foi possível inativar o cliente.");
  if (!data) throw new CustomerNotFoundError();
}
