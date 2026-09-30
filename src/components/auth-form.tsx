"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  inviteToken,
}: {
  mode: Mode;
  inviteToken?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const invite =
    typeof inviteToken === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      inviteToken,
    )
      ? inviteToken
      : null;
  const nextPath = invite ? `/join?token=${invite}` : "/dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.replace(nextPath);
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (authError) throw authError;

        if (data.session) {
          router.replace(invite ? nextPath : "/onboarding");
        } else {
          setSuccess(
            invite
              ? "Confira seu email para confirmar a conta. Depois, abra o link do convite novamente."
              : "Confira seu email para confirmar a conta antes de entrar.",
          );
        }
      }
      router.refresh();
    } catch {
      setError(
        mode === "login"
          ? "Não foi possível entrar. Confira email e senha."
          : "Não foi possível criar a conta. Confira os dados e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b3f34] px-5 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, #d8c29a 0, transparent 28%), radial-gradient(circle at 85% 80%, #0f8a59 0, transparent 30%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#082f28]/90 p-7 shadow-2xl backdrop-blur sm:p-9">
        <BrandLogo priority className="w-48 rounded-xl bg-white px-3 py-2" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          {isLogin ? "Entre na sua arena" : "Crie sua conta"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isLogin
            ? "Acesse a gestão da sua arena."
            : invite
              ? "Crie sua conta para aceitar o convite da equipe."
              : "O próximo passo será cadastrar sua arena."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-[#d8c29a] focus:ring-2 focus:ring-[#d8c29a]/20"
            />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <span className="relative mt-2 block">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-20 text-white outline-none focus:border-[#d8c29a] focus:ring-2 focus:ring-[#d8c29a]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-[#d8c29a] hover:text-white"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
            {!isLogin && (
              <span className="mt-2 block text-xs font-normal text-slate-400">
                Use ao menos 8 caracteres, com letras e números.
              </span>
            )}
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-lime-300">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#d8c29a] px-4 py-3 font-semibold text-[#0b3f34] transition hover:bg-[#ead9b8] disabled:opacity-60"
          >
            {busy ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {isLogin && (
          <Link
            href="/forgot-password"
            className="mt-5 block text-center text-sm text-slate-300 hover:text-[#d8c29a]"
          >
            Esqueceu a senha?
          </Link>
        )}

        <p className="mt-7 text-center text-sm text-slate-400">
          {isLogin ? "Ainda não tem conta? " : "Já tem conta? "}
          <Link
            href={`${isLogin ? "/signup" : "/login"}${invite ? `?invite=${invite}` : ""}`}
            className="font-semibold text-[#d8c29a] hover:underline"
          >
            {isLogin ? "Cadastre-se" : "Entrar"}
          </Link>
        </p>
      </div>
    </main>
  );
}
