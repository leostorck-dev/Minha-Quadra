import { redirect } from "next/navigation";
import { SettingsPanel } from "@/components/settings-panel";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "OWNER") redirect("/dashboard");
  const supabase = await createClient();
  const [arena, publicPage, members, invites] = await Promise.all([
    supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", context.tenantId)
      .single(),
    supabase
      .from("arena_public_pages")
      .select("enabled, whatsapp, address, player_instructions")
      .eq("tenant_id", context.tenantId)
      .maybeSingle(),
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
  if (
    arena.error ||
    publicPage.error ||
    members.error ||
    invites.error ||
    !arena.data
  )
    throw new Error("Não foi possível carregar as configurações.");
  return (
    <SettingsPanel
      arenaName={arena.data.name}
      arenaSlug={arena.data.slug}
      publicPage={{
        enabled: publicPage.data?.enabled ?? false,
        whatsapp: publicPage.data?.whatsapp ?? "",
        address: publicPage.data?.address ?? "",
        instructions: publicPage.data?.player_instructions ?? "",
      }}
      members={members.data ?? []}
      invites={invites.data ?? []}
      ownerId={context.userId}
    />
  );
}
