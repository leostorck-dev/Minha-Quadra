"use client";

import { useState } from "react";
import type { FinanceStatus, FinanceType } from "@/features/finance/validation";

export function FinanceExport({
  month,
  type,
  status,
}: {
  month: string;
  type: FinanceType | "all";
  status: FinanceStatus | "all";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ month, type, status });
      const response = await fetch(`/api/finance/export?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error?.message ?? "Não foi possível exportar o financeiro.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `financeiro-${month}-${type}-${status}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível exportar o financeiro.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Preparando CSV…" : "Exportar lançamentos em CSV"}
      </button>
      <p className="mt-2 text-xs text-slate-400">
        O arquivo inclui todas as páginas do mês, tipo e situação selecionados.
        Valores em reais; horários de pagamento em UTC.
      </p>
      {busy && (
        <p role="status" className="mt-2 text-sm">
          Preparando o relatório solicitado…
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
