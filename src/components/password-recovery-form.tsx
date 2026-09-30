"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b3f34] px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#082f28] p-7 shadow-2xl sm:p-9">
        <BrandLogo priority className="w-48 rounded-xl bg-white px-3 py-2" />
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
            <span className="relative mt-2 block">
              <input
                type={isRequest ? "email" : showPassword ? "text" : "password"}
                autoComplete={isRequest ? "email" : "new-password"}
                required
                minLength={isRequest ? undefined : 8}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 pr-20 outline-none focus:border-[#d8c29a] focus:ring-2 focus:ring-[#d8c29a]/20"
              />
              {!isRequest && (
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-[#d8c29a]"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              )}
            </span>
            {!isRequest && (
              <span className="mt-2 block text-xs font-normal text-slate-400">
                Use ao menos 8 caracteres, com letras e números.
              </span>
            )}
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
            className="w-full rounded-xl bg-[#d8c29a] px-4 py-3 font-semibold text-[#0b3f34] hover:bg-[#ead9b8] disabled:opacity-60"
          >
            {busy ? "Aguarde..." : isRequest ? "Enviar link" : "Salvar senha"}
          </button>
        </form>
        <Link
          href="/login"
          className="mt-7 block text-center text-sm text-[#d8c29a] hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
