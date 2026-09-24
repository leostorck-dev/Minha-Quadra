"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function JoinForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: joinError } = await supabase.rpc("join_arena", {
      p_token: token,
      member_name: name.trim(),
    });
    setBusy(false);
    if (joinError) {
      setError(
        "Não foi possível aceitar o convite. Confira o email da conta e a validade do link.",
      );
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm">
        Seu nome
        <input
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-lime-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
      >
        {busy ? "Aguarde..." : "Aceitar convite"}
      </button>
    </form>
  );
}
