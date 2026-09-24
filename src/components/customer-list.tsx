"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/service";

type ListResponse = {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

export function CustomerList() {
  const [searchDraft, setSearchDraft] = useState("");
  const [query, setQuery] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tag, setTag] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{
    key: string;
    data?: ListResponse;
    error?: string;
  } | null>(null);
  const requestKey = JSON.stringify([query, status, tag, page]);
  const loading = result?.key !== requestKey;
  const data = loading ? null : (result.data ?? null);
  const error = loading ? "" : (result.error ?? "");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query,
      status,
      page: String(page),
      tag,
    });
    fetch(`/api/customers?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível carregar os clientes.");
        return (await response.json()) as ListResponse;
      })
      .then((data) => setResult({ key: requestKey, data }))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setResult({
          key: requestKey,
          error: "Não foi possível carregar os clientes. Tente novamente.",
        });
      });

    return () => controller.abort();
  }, [query, status, tag, page, requestKey]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(searchDraft.trim());
    setTag(tagDraft.trim().toLowerCase());
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-lime-400">Operação</p>
          <h1 className="mt-2 text-3xl font-bold">Clientes</h1>
          <p className="mt-2 text-sm text-slate-400">
            Cadastre e encontre pessoas da sua arena.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300"
        >
          Novo cliente
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={search} className="flex min-w-0 flex-1 flex-wrap gap-2">
          <label htmlFor="customer-search" className="sr-only">
            Buscar por nome
          </label>
          <input
            id="customer-search"
            type="search"
            maxLength={80}
            placeholder="Buscar por nome"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
          />
          <label htmlFor="customer-tag" className="sr-only">
            Filtrar por etiqueta
          </label>
          <input
            id="customer-tag"
            type="search"
            maxLength={30}
            placeholder="Etiqueta"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            className="min-w-32 flex-1 rounded-lg border border-white/15 bg-slate-900 px-4 py-3 outline-none focus:border-lime-400"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10"
          >
            Buscar
          </button>
        </form>
        <label className="sr-only" htmlFor="customer-status">
          Filtrar status
        </label>
        <select
          id="customer-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-white/15 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-lime-400"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        {loading ? (
          <p role="status" className="p-8 text-sm text-slate-400">
            Carregando clientes...
          </p>
        ) : error ? (
          <p role="alert" className="p-8 text-sm text-rose-300">
            {error}
          </p>
        ) : data?.items.length ? (
          <ul className="divide-y divide-white/10">
            {data.items.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-white/5"
                >
                  <div>
                    <p className="font-semibold">{customer.name}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {customer.phone ?? customer.email}
                    </p>
                    {customer.tags.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1">
                        {customer.tags.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-sky-400/10 px-2 py-0.5 text-xs text-sky-200"
                          >
                            {item}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.status === "active" ? "bg-lime-400/10 text-lime-300" : "bg-slate-700 text-slate-300"}`}
                  >
                    {customer.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center">
            <p className="font-semibold">Nenhum cliente encontrado</p>
            <p className="mt-2 text-sm text-slate-400">
              Ajuste a busca ou cadastre o primeiro cliente.
            </p>
          </div>
        )}
      </div>

      {!loading && !error && data && data.total > 0 && (
        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-400">
          <span>
            {data.total} cliente{data.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
