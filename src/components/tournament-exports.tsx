"use client";
import { useState } from "react";
export function TournamentExports({ tournamentId }: { tournamentId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(kind: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/export?kind=${kind}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Falha ao exportar.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `torneio-${tournamentId}-${kind}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao exportar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-5 border-t border-white/10 pt-4">
      <h3 className="text-sm font-semibold">Relatórios do torneio</h3>
      <p className="mt-1 text-xs text-slate-400">
        Baixe o estado atual em CSV para abrir no Excel. Resultados pendentes
        são identificados no arquivo.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          ["standings", "Classificação"],
          ["matches", "Partidas"],
          ["podium", "Pódio"],
        ].map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            disabled={busy}
            onClick={() => void download(kind)}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
          >
            Exportar {label}
          </button>
        ))}
      </div>
      {busy && (
        <p role="status" className="mt-2 text-xs text-slate-400">
          Preparando arquivo...
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
