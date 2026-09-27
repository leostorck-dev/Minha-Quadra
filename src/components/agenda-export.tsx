"use client";
import { useState } from "react";
export function AgendaExport({
  from,
  to,
  courtId,
  status,
  paymentSituation,
}: {
  from: string;
  to: string;
  courtId: string;
  status: string;
  paymentSituation: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        from,
        to,
        courtId,
        status,
        paymentSituation,
      });
      const response = await fetch("/api/reservations/export?" + params, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error?.message ?? "Não foi possível exportar a agenda.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "agenda.csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível exportar a agenda.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Preparando CSV…" : "Exportar agenda em CSV"}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        Inclui o dia ou semana e os filtros selecionados. Horários no fuso da
        arena.
      </p>
      {busy && (
        <p role="status" className="mt-2 text-sm">
          Preparando a exportação…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
