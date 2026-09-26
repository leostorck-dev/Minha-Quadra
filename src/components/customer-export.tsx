"use client";
import { useState } from "react";
export function CustomerExport({
  query,
  status,
  tag,
  segment,
}: {
  query: string;
  status: string;
  tag: string;
  segment: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, status, tag, segment });
      const response = await fetch("/api/customers/export?" + params, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error?.message ?? "Não foi possível exportar os clientes.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "clientes.csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível exportar os clientes.",
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
        {busy ? "Preparando CSV…" : "Exportar clientes em CSV"}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        Inclui todas as páginas com os filtros aplicados. Para nome e etiqueta,
        clique em Buscar antes de exportar. Última reserva em UTC.
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
