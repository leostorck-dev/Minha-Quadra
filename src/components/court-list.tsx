"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Court } from "@/features/courts/service";

const labels = {
  available: "Disponível",
  maintenance: "Manutenção",
  inactive: "Inativa",
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CourtList({ canEdit }: { canEdit: boolean }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [result, setResult] = useState<{
    key: string;
    items?: Court[];
    error?: string;
  } | null>(null);
  const key = JSON.stringify([query, status]);
  const loading = result?.key !== key;
  const items = loading ? null : result.items;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, status });
    fetch(`/api/courts?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível carregar as quadras.");
        return (await response.json()) as { items: Court[] };
      })
      .then((data) => setResult({ key, items: data.items }))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setResult({
          key,
          error: "Não foi possível carregar as quadras. Tente novamente.",
        });
      });
    return () => controller.abort();
  }, [query, status, key]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-lime-400">Operação</p>
          <h1 className="mt-2 text-3xl font-bold">Quadras</h1>
          <p className="mt-2 text-sm text-slate-400">
            Configure espaços, horários e preços da arena.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/courts/new"
            className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300"
          >
            Nova quadra
          </Link>
        )}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={search} className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="court-search" className="sr-only">
            Buscar quadra
          </label>
          <input
            id="court-search"
            type="search"
            maxLength={80}
            placeholder="Buscar por nome"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Buscar
          </button>
        </form>
        <label htmlFor="court-status" className="sr-only">
          Filtrar status
        </label>
        <select
          id="court-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-white/15 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-lime-400"
        >
          <option value="all">Todas</option>
          <option value="available">Disponíveis</option>
          <option value="maintenance">Em manutenção</option>
          <option value="inactive">Inativas</option>
        </select>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        {loading ? (
          <p role="status" className="p-8 text-sm text-slate-400">
            Carregando quadras...
          </p>
        ) : error ? (
          <p role="alert" className="p-8 text-sm text-rose-300">
            {error}
          </p>
        ) : items?.length ? (
          <ul className="divide-y divide-white/10">
            {items.map((court) => (
              <li key={court.id}>
                <Link
                  href={`/courts/${court.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-white/5"
                >
                  <div>
                    <p className="font-semibold">{court.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {court.sport} · {court.openingTime}–{court.closingTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {money.format(court.pricePerHour)}/h
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {labels[court.status]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">Nenhuma quadra encontrada</p>
            <p className="mt-2 text-sm text-slate-400">
              Ajuste os filtros{canEdit ? " ou cadastre a primeira quadra" : ""}
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
