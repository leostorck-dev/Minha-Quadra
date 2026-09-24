import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings-panel";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "OWNER") redirect("/dashboard");
  const supabase = await createClient();
  const [arena, members, invites] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", context.tenantId).single(),
    supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("tenant_id", context.tenantId)
      .order("name"),
    supabase
      .from("staff_invites")
      .select("id, email, role, token, status, expires_at, created_at")
      .eq("tenant_id", context.tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (arena.error || members.error || invites.error || !arena.data)
    throw new Error("Não foi possível carregar as configurações.");
  return (
    <SettingsPanel
      arenaName={arena.data.name}
      members={members.data ?? []}
      invites={invites.data ?? []}
      ownerId={context.userId}
    />
  );
}
