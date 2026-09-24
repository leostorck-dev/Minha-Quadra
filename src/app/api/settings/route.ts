import { requireRole } from "@/lib/auth/context";
import { apiError, privateJson } from "@/lib/api/errors";
import { ValidationError } from "@/lib/api/validation-error";
import { createClient } from "@/lib/supabase/server";

const roles = ["MANAGER", "RECEPTIONIST", "COACH"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("Dados inválidos.");
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const context = await requireRole(["OWNER"]);
    const body = await bodyOf(request);
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new ValidationError("Informe um email válido.");
    if (typeof role !== "string" || !roles.some((item) => item === role))
      throw new ValidationError("Selecione uma função válida.");
    const supabase = await createClient();
    const { data: member } = await supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("email", email)
      .maybeSingle();
    if (member)
      return privateJson(
        { error: { message: "Este email já pertence à equipe." } },
        409,
      );
    const { data, error } = await supabase
      .from("staff_invites")
      .insert({ tenant_id: context.tenantId, email, role })
      .select("id, email, role, token, status, expires_at, created_at")
      .single();
    if (error?.code === "23505")
      return privateJson(
        {
          error: { message: "Já existe um convite pendente para este email." },
        },
        409,
      );
    if (error || !data) throw error ?? new Error("Convite não criado.");
    return privateJson({ invite: data }, 201);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireRole(["OWNER"]);
    const body = await bodyOf(request);
    const supabase = await createClient();
    if (body.action === "rename") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 120)
        throw new ValidationError("O nome deve ter entre 2 e 120 caracteres.");
      const { data, error } = await supabase
        .from("tenants")
        .update({ name })
        .eq("id", context.tenantId)
        .select("name")
        .single();
      if (error || !data) throw error ?? new Error("Arena não alterada.");
      return privateJson({ name: data.name });
    }
    if (body.action === "revoke") {
      if (typeof body.id !== "string" || !uuid.test(body.id))
        throw new ValidationError("Convite inválido.");
      const { data, error } = await supabase
        .from("staff_invites")
        .update({ status: "revoked" })
        .eq("id", body.id)
        .eq("tenant_id", context.tenantId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return privateJson(
          { error: { message: "Convite não encontrado." } },
          404,
        );
      return privateJson({ id: data.id });
    }
    throw new ValidationError("Ação inválida.");
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireRole(["OWNER"]);
    const body = await bodyOf(request);
    if (
      typeof body.id !== "string" ||
      !uuid.test(body.id) ||
      body.id === context.userId
    )
      throw new ValidationError("Membro inválido.");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", body.id)
      .eq("tenant_id", context.tenantId)
      .neq("role", "OWNER")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return privateJson({ error: { message: "Membro não encontrado." } }, 404);
    return privateJson({ id: data.id });
  } catch (error) {
    return apiError(error);
  }
}
