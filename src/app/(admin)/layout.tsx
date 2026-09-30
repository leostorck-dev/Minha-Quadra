import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { BrandLogo } from "@/components/brand-logo";
import { SignOutButton } from "@/components/sign-out-button";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthContext();
  if (!context) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    redirect(error || !data?.claims?.sub ? "/login" : "/onboarding");
  }

  const supabase = await createClient();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("name, status")
    .eq("id", context.tenantId)
    .single();
  if (error || !tenant) throw new Error("Não foi possível carregar a arena.");

  const roleLabels = {
    OWNER: "Proprietário",
    MANAGER: "Gerência",
    RECEPTIONIST: "Recepção",
    COACH: "Professor",
  } as const;

  return (
    <div className="min-h-screen bg-[#071d19] text-white md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0b3f34] px-5 py-7 md:block">
        <BrandLogo className="mb-9 w-full rounded-xl bg-white px-3 py-2" />
        <AdminNav role={context.role} />
      </aside>
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{tenant.name}</p>
            <p className="text-xs text-slate-400">
              {roleLabels[context.role]} ·{" "}
              {tenant.status === "active" ? "Arena ativa" : "Arena suspensa"}
            </p>
          </div>
          <SignOutButton />
        </header>
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
          {children}
        </main>
      </div>
      <div className="md:hidden">
        <AdminNav role={context.role} />
      </div>
    </div>
  );
}
