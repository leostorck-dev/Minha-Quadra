"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-60"
    >
      {busy ? "Saindo..." : "Sair"}
    </button>
  );
}
