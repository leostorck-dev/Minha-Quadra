import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { JoinForm } from "@/components/join-form";
import { getAuthContext } from "@/lib/auth/context";
import { noIndexMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = noIndexMetadata("Entrar na equipe");

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && uuid.test(token);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const context = data?.claims?.sub ? await getAuthContext() : null;
  if (context) redirect("/dashboard");
  const invite =
    valid && data?.claims?.sub
      ? await supabase
          .from("staff_invites")
          .select("email, role, expires_at")
          .eq("token", token)
          .eq("status", "pending")
          .maybeSingle()
      : null;
  const next = valid ? encodeURIComponent(token) : "";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b3f34] px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#082f28] p-7 shadow-2xl">
        <BrandLogo priority className="w-48 rounded-xl bg-white px-3 py-2" />
        <h1 className="mt-6 text-3xl font-bold">Entrar na equipe</h1>
        {!valid ? (
          <p className="mt-4 text-sm text-rose-300">
            Link de convite inválido.
          </p>
        ) : !data?.claims?.sub ? (
          <>
            <p className="mt-4 text-sm text-slate-300">
              Entre ou crie uma conta com o email que recebeu o convite.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href={`/login?invite=${next}`}
                className="rounded-lg bg-lime-400 px-4 py-3 font-semibold text-slate-950"
              >
                Entrar
              </Link>
              <Link
                href={`/signup?invite=${next}`}
                className="rounded-lg border border-white/20 px-4 py-3"
              >
                Criar conta
              </Link>
            </div>
          </>
        ) : invite?.data ? (
          <>
            <p className="mt-4 text-sm text-slate-300">
              Convite para {invite.data.email}. Confirme sua entrada abaixo.
            </p>
            <JoinForm token={token} />
          </>
        ) : (
          <p className="mt-4 text-sm text-rose-300">
            Convite indisponível. Confira se ele não expirou, foi revogado ou
            pertence a outro email.
          </p>
        )}
      </div>
    </main>
  );
}
