"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRequest = mode === "request";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      if (isRequest) {
        const { error: recoveryError } =
          await supabase.auth.resetPasswordForEmail(value.trim(), {
            redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
          });
        if (recoveryError) throw recoveryError;
        setMessage(
          "Se o email estiver cadastrado, enviaremos um link de recuperação.",
        );
      } else {
        const { error: updateError } = await supabase.auth.updateUser({
          password: value,
        });
        if (updateError) throw updateError;
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      }
    } catch {
      setError(
        isRequest
          ? "Não foi possível enviar o email agora. Tente novamente."
          : "Não foi possível atualizar a senha. Solicite um novo link.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase"
        >
          Minha Quadra
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          {isRequest ? "Recuperar senha" : "Definir nova senha"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {isRequest
            ? "Enviaremos um link para o seu email."
            : "Escolha uma nova senha para sua conta."}
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            {isRequest ? "Email" : "Nova senha"}
            <input
              type={isRequest ? "email" : "password"}
              autoComplete={isRequest ? "email" : "new-password"}
              required
              minLength={isRequest ? undefined : 6}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            />
          </label>
          {message && (
            <p role="status" className="text-sm text-lime-300">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-lime-400 px-4 py-3 font-semibold text-slate-950 hover:bg-lime-300 disabled:opacity-60"
          >
            {busy ? "Aguarde..." : isRequest ? "Enviar link" : "Salvar senha"}
          </button>
        </form>
        <Link
          href="/login"
          className="mt-7 block text-center text-sm text-lime-400 hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
