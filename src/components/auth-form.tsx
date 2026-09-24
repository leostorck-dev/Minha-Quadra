"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase"
        >
          Minha Quadra
        </Link>
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
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 text-white outline-none focus:border-lime-400"
            />
          </label>
          <label className="block text-sm font-medium">
            Senha
            <input
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 text-white outline-none focus:border-lime-400"
            />
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
            className="w-full rounded-lg bg-lime-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-lime-300 disabled:opacity-60"
          >
            {busy ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {isLogin && (
          <Link
            href="/forgot-password"
            className="mt-5 block text-center text-sm text-slate-300 hover:text-lime-400"
          >
            Esqueceu a senha?
          </Link>
        )}

        <p className="mt-7 text-center text-sm text-slate-400">
          {isLogin ? "Ainda não tem conta? " : "Já tem conta? "}
          <Link
            href={`${isLogin ? "/signup" : "/login"}${invite ? `?invite=${invite}` : ""}`}
            className="font-semibold text-lime-400 hover:underline"
          >
            {isLogin ? "Cadastre-se" : "Entrar"}
          </Link>
        </p>
      </div>
    </main>
  );
}
