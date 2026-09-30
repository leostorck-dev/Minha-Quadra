"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro inesperado na interface", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f2] px-6 text-[#1f2937]">
      <div className="w-full max-w-lg rounded-3xl border border-[#0f6b46]/15 bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-bold tracking-[0.22em] text-[#0f6b46] uppercase">
          Minha Quadra
        </p>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">
          Algo saiu da linha
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Não foi possível carregar esta área agora. Seus dados não foram
          alterados.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 rounded-full bg-[#0f6b46] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0b3f34]"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
