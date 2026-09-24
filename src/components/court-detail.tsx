"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourtEditor } from "@/components/court-editor";
import type { Court } from "@/features/courts/service";
import type { CourtStatus } from "@/features/courts/validation";

const labels = {
  available: "Disponível",
  maintenance: "Em manutenção",
  inactive: "Inativa",
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CourtDetail({ id, canEdit }: { id: string; canEdit: boolean }) {
  const [court, setCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/courts/${id}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Quadra não encontrada."
              : "Não foi possível carregar a quadra.",
          );
        return (await response.json()) as { court: Court };
      })
      .then((data) => setCourt(data.court))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar a quadra.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  async function changeStatus(status: CourtStatus) {
    if (!court) return;
    if (status === "inactive" && !window.confirm("Desativar esta quadra?"))
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/courts/${court.id}`, {
        method: status === "inactive" ? "DELETE" : "PATCH",
        headers:
          status === "inactive"
            ? undefined
            : { "Content-Type": "application/json" },
        body: status === "inactive" ? undefined : JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Não foi possível alterar o status.");
      if (status === "inactive") setCourt({ ...court, status });
      else setCourt(((await response.json()) as { court: Court }).court);
    } catch {
      setError("Não foi possível alterar o status. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <p role="status" className="text-sm text-slate-400">
        Carregando quadra...
      </p>
    );
  if (error && !court)
    return (
      <p role="alert" className="text-sm text-rose-300">
        {error}
      </p>
    );
  if (!court) return null;

  return (
    <section className="max-w-3xl">
      <Link href="/courts" className="text-sm text-lime-400 hover:underline">
        ← Voltar para quadras
      </Link>
      <div className="mt-5 mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{court.name}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {court.sport} · {labels[court.status]}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {court.status !== "available" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("available")}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
              >
                Disponibilizar
              </button>
            )}
            {court.status !== "maintenance" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("maintenance")}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
              >
                Colocar em manutenção
              </button>
            )}
            {court.status !== "inactive" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => changeStatus("inactive")}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
              >
                Desativar
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-5 text-sm text-rose-300">
          {error}
        </p>
      )}
      {canEdit ? (
        <CourtEditor key={court.id} court={court} onSaved={setCourt} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-900 p-6 text-sm">
          <p>
            <span className="text-slate-400">Horário:</span> {court.openingTime}
            –{court.closingTime}
          </p>
          <p>
            <span className="text-slate-400">Preço padrão:</span>{" "}
            {money.format(court.pricePerHour)}/h
          </p>
          {court.description && (
            <p>
              <span className="text-slate-400">Descrição:</span>{" "}
              {court.description}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
