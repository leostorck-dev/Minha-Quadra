"use client";

import { useState } from "react";
import type {
  FinanceStatus,
  FinanceScope,
  FinanceType,
  FinanceSource,
} from "@/features/finance/validation";

export function FinanceExport({
  scope,
  month,
  type,
  status,
  source,
  category,
  query,
}: {
  scope: FinanceScope;
  month: string;
  type: FinanceType | "all";
  status: FinanceStatus | "all";
  source: FinanceSource | "all";
  category: string;
  query: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(report: "transactions" | "categories") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        report,
        scope,
        month,
        type,
        status,
        source,
        category,
        q: query,
      });
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
      link.download =
        scope === "overdue"
          ? "financeiro-contas-vencidas.csv"
          : scope === "upcoming"
            ? "financeiro-proximos-7-dias.csv"
            : `financeiro-${month}-${type}-${status}.csv`;
      if (report === "categories")
        link.download = link.download.replace(
          "financeiro-",
          "financeiro-categorias-",
        );
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
        onClick={() => void download("transactions")}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
      >
        {busy ? "Preparando CSV…" : "Exportar lançamentos em CSV"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void download("categories")}
        className="ml-2 mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
      >
        Exportar resumo por categoria
      </button>
      <p className="mt-2 text-xs text-slate-400">
        O arquivo inclui todas as páginas com os filtros selecionados. Valores
        em reais; horários de pagamento em UTC. O resumo separa receitas,
        despesas e situações; valores cancelados não representam movimentação
        efetiva.
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
