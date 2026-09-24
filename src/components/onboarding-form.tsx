"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function OnboardingForm() {
  const router = useRouter();
  const [arenaName, setArenaName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const supabase = createClient();
      const { error: onboardingError } = await supabase.rpc("onboard_arena", {
        arena_name: arenaName.trim(),
        arena_slug: slug.trim().toLowerCase(),
        owner_name: ownerName.trim(),
      });
      if (onboardingError) {
        setError(
          onboardingError.code === "23505"
            ? "Este identificador já está em uso. Escolha outro."
            : "Não foi possível cadastrar a arena. Confira os dados e tente novamente.",
        );
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-9">
        <span className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase">
          Minha Quadra
        </span>
        <h1 className="mt-6 text-3xl font-bold">Cadastre sua arena</h1>
        <p className="mt-2 text-sm text-slate-400">
          Esses dados identificam seu espaço dentro do Minha Quadra.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Nome da arena
            <input
              required
              minLength={2}
              maxLength={120}
              value={arenaName}
              onChange={(event) => setArenaName(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            />
          </label>
          <label className="block text-sm font-medium">
            Identificador
            <input
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              placeholder="exemplo-arena-central"
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Use letras minúsculas, números e hífens.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Seu nome
            <input
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
            />
          </label>
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
            {busy ? "Aguarde..." : "Criar arena"}
          </button>
        </form>
      </div>
    </main>
  );
}
