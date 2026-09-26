"use client";

import { useEffect, useId, useState } from "react";

type Athlete = { id: string; name: string };
type Result = {
  athletes: Athlete[];
  count: number;
  page: number;
  pageSize: number;
};

export function TournamentAthletePicker({
  label,
  value,
  excludedId,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  excludedId: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<Athlete | null>(null);
  const [loaded, setLoaded] = useState<{
    url: string;
    result?: Result;
    error?: string;
  } | null>(null);
  const url = `/api/tournaments/athletes?${new URLSearchParams({ q: query, page: String(page) })}`;
  const current = loaded?.url === url ? loaded : null;

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(url, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok)
            throw new Error(body.error?.message ?? "Falha ao buscar atletas.");
          if (!controller.signal.aborted) setLoaded({ url, result: body });
        })
        .catch((cause: unknown) => {
          if (!controller.signal.aborted)
            setLoaded({
              url,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Falha ao buscar atletas.",
            });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-2 rounded-lg border border-white/10 p-3 text-sm"
    >
      <legend className="px-1 font-semibold">{label}</legend>
      {value && chosen?.id === value ? (
        <div>
          <p className="text-lime-300">Selecionado: {chosen.name}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => onChange("")}
          >
            Trocar atleta
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={inputId}>Buscar por nome</label>
          <input
            id={inputId}
            type="search"
            maxLength={80}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-white/20 bg-slate-800 p-2"
          />
          {!current && <p role="status">Buscando atletas…</p>}
          {current?.error && (
            <p role="alert" className="text-rose-300">
              {current.error}
            </p>
          )}
          {current?.result && (
            <>
              <ul
                className="max-h-48 space-y-1 overflow-y-auto"
                aria-label={`Resultados para ${label}`}
              >
                {current.result.athletes.map((athlete) => (
                  <li key={athlete.id}>
                    <button
                      type="button"
                      disabled={athlete.id === excludedId}
                      className="w-full rounded bg-slate-800 p-2 text-left hover:bg-slate-700 disabled:opacity-40"
                      onClick={() => {
                        setChosen(athlete);
                        onChange(athlete.id);
                      }}
                    >
                      {athlete.name}
                      {athlete.id === excludedId ? " (já selecionado)" : ""}
                    </button>
                  </li>
                ))}
              </ul>
              {!current.result.athletes.length && (
                <p>Nenhum atleta ativo encontrado.</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="disabled:opacity-40"
                >
                  Anterior
                </button>
                <span>
                  {page} /{" "}
                  {Math.max(
                    1,
                    Math.ceil(current.result.count / current.result.pageSize),
                  )}
                </span>
                <button
                  type="button"
                  disabled={
                    page * current.result.pageSize >= current.result.count
                  }
                  onClick={() => setPage(page + 1)}
                  className="disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
