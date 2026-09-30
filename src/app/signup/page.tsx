import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandLogo } from "@/components/brand-logo";
import { noIndexMetadata } from "@/lib/metadata";
import { getSignupMode } from "@/lib/public-config";

export const metadata = noIndexMetadata("Criar conta");

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const signupMode = getSignupMode();
  const signupUnavailable =
    signupMode === "closed" || (signupMode === "invite" && !invite);

  if (signupUnavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b3f34] px-5 py-12 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#082f28] p-8 text-center shadow-2xl">
          <BrandLogo
            priority
            className="mx-auto w-48 rounded-xl bg-white px-3 py-2"
          />
          <h1 className="mt-7 text-3xl font-bold tracking-tight">
            {signupMode === "closed"
              ? "Cadastro temporariamente fechado"
              : "Cadastro por convite"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {signupMode === "closed"
              ? "A criação de novas contas está pausada neste momento. Contas existentes continuam acessando normalmente."
              : "Novas arenas estão sendo liberadas de forma controlada. Se você recebeu um convite, abra o link enviado pela equipe."}
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex rounded-full bg-[#d8c29a] px-6 py-3 font-semibold text-[#0b3f34] hover:bg-[#ead9b8]"
          >
            Já tenho uma conta
          </Link>
        </div>
      </main>
    );
  }

  return <AuthForm mode="signup" inviteToken={invite} />;
}
