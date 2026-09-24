import { createClient } from "@/lib/supabase/server";

export const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "COACH"] as const;
export type Role = (typeof ROLES)[number];

export type AuthContext = {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
};

export class UnauthorizedError extends Error {
  constructor() {
    super("É necessário entrar na sua conta.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Você não tem permissão para esta operação.");
    this.name = "ForbiddenError";
  }
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, tenant_id, name, email, role")
    .eq("id", claimsData.claims.sub)
    .maybeSingle();

  if (profileError) throw new Error("Não foi possível carregar o perfil.");
  if (!profile || !ROLES.some((role) => role === profile.role)) return null;

  return {
    userId: profile.id,
    tenantId: profile.tenant_id,
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
  };
}

export async function requireRole(allowedRoles: readonly Role[]) {
  const context = await getAuthContext();
  if (!context) throw new UnauthorizedError();
  if (!allowedRoles.includes(context.role)) throw new ForbiddenError();
  return context;
}
