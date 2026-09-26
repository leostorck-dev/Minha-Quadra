"use client";

import { useEffect, useState } from "react";
import { groupStandings } from "@/features/tournaments/standings";
import { TournamentMatchResult } from "@/components/tournament-match-result";
import { TournamentKnockoutPanel } from "@/components/tournament-knockout-panel";
import type {
  TournamentCategory,
  TournamentDraw,
} from "@/features/tournaments/service";

export function TournamentDrawPanel({
  tournamentId,
  categories,
  closed,
  canManage,
  onDrawn,
}: {
  tournamentId: string;
  categories: TournamentCategory[];
  closed: boolean;
  canManage: boolean;
  onDrawn: () => Promise<void>;
}) {
  const [data, setData] = useState<TournamentDraw | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [groupSize, setGroupSize] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const path = `/api/tournaments/${tournamentId}/draw`;

  async function refreshResults() {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok)
      throw new Error(
        "Não foi possível atualizar os confrontos. Recarregue a página.",
      );
    setData(await response.json());
    setNotice("Confrontos e classificação atualizados.");
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch(path, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Falha ao carregar o sorteio.",
          );
        if (!controller.signal.aborted) setData(body);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao carregar grupos.",
          );
      });
    return () => controller.abort();
  }, [path]);

  async function draw() {
    const category = categories.find((item) => item.id === categoryId);
    if (
      !category ||
      !window.confirm(
        `Sortear a categoria ${category.name}? O sorteio é definitivo e impede reabrir as inscrições do torneio.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, groupSize }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Falha ao sortear.");
      setNotice("Sorteio salvo. Grupos e confrontos gerados.");
      setCategoryId("");
      const refreshed = await fetch(path, { cache: "no-store" });
      if (!refreshed.ok)
        throw new Error(
          "Sorteio salvo. Recarregue a página para visualizar os grupos.",
        );
      setData(await refreshed.json());
      await onDrawn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao sortear.");
    } finally {
      setBusy(false);
    }
  }

  const available = categories.filter(
    (item) =>
      !item.drawn_at &&
      !data?.groups.some((group) => group.category_id === item.id),
  );
  const label = (id: string) =>
    data?.entries.find((entry) => entry.team_id === id)?.team_label ?? "Dupla";
  return (
    <section className="mt-6 border-t border-white/10 pt-5">
      <h3 className="font-semibold">Grupos e confrontos</h3>
      <p className="mt-2 text-sm text-slate-400">
        Sorteio aleatório com grupos equilibrados de até 3 ou 4 duplas. Todas as
        duplas jogam entre si dentro do grupo. Mínimo de 2 e máximo de 64 duplas
        por categoria.
      </p>
      {!closed && (
        <p className="mt-3 text-sm text-amber-300">
          Feche as inscrições para realizar o sorteio.
        </p>
      )}
      {closed && canManage && available.length > 0 && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void draw();
          }}
        >
          <label className="text-sm">
            Categoria
            <select
              required
              disabled={busy}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 block rounded-lg border border-white/20 bg-slate-800 p-3"
            >
              <option value="">Selecione</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Tamanho máximo do grupo
            <select
              disabled={busy}
              value={groupSize}
              onChange={(event) => setGroupSize(Number(event.target.value))}
              className="mt-1 block rounded-lg border border-white/20 bg-slate-800 p-3"
            >
              <option value={3}>3 duplas</option>
              <option value={4}>4 duplas</option>
            </select>
          </label>
          <button
            disabled={busy || !categoryId || !data}
            className="rounded-lg bg-lime-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Sorteando..." : "Sortear categoria"}
          </button>
          <p className="w-full text-xs text-amber-300">
            O sorteio é definitivo. Após sortear a primeira categoria, as
            inscrições do torneio não poderão ser reabertas.
          </p>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-lime-300">
          {notice}
        </p>
      )}
      {!data && !error && (
        <p className="mt-3 text-sm text-slate-400">Carregando grupos...</p>
      )}
      {data?.groups.length === 0 && (
        <p className="mt-3 text-sm text-slate-400">
          Nenhuma categoria sorteada.
        </p>
      )}
      {categories.map((category) => {
        const groups =
          data?.groups.filter((group) => group.category_id === category.id) ??
          [];
        if (!groups.length) return null;
        return (
          <div key={category.id} className="mt-6">
            <h4 className="font-semibold text-lime-300">{category.name}</h4>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {groups.map((group) => (
                <article key={group.id} className="rounded-lg bg-slate-800 p-4">
                  <h5 className="font-semibold">Grupo {group.number}</h5>
                  <ul className="mt-2 space-y-1 text-sm text-slate-200">
                    {data?.entries
                      .filter((entry) => entry.group_id === group.id)
                      .map((entry) => (
                        <li key={entry.team_id}>
                          {entry.position}. {entry.team_label}
                        </li>
                      ))}
                  </ul>
                  <h6 className="mt-4 text-xs font-bold text-slate-400 uppercase">
                    Classificação{" "}
                    {data?.matches.some(
                      (match) =>
                        match.group_id === group.id && match.score_a === null,
                    )
                      ? "parcial"
                      : "do grupo"}
                  </h6>
                  <p className="mt-1 text-xs text-slate-400">
                    Ordem: vitórias, saldo e pontos marcados. Empates nesses
                    critérios compartilham posição. Placar simples, sem sets
                    separados.
                  </p>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <caption className="sr-only">
                        Classificação do grupo {group.number}
                      </caption>
                      <thead>
                        <tr>
                          {[
                            "Pos.",
                            "Dupla",
                            "Jogos",
                            "Vitórias",
                            "Derrotas",
                            "Pró",
                            "Contra",
                            "Saldo",
                          ].map((text) => (
                            <th key={text} scope="col" className="p-2">
                              {text}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupStandings(
                          data?.entries.filter(
                            (e) => e.group_id === group.id,
                          ) ?? [],
                          data?.matches.filter(
                            (m) => m.group_id === group.id,
                          ) ?? [],
                        ).map((row) => (
                          <tr
                            key={row.teamId}
                            className="border-t border-white/10"
                          >
                            <td className="p-2">{row.rank}</td>
                            <th scope="row" className="p-2 font-normal">
                              {row.label}
                            </th>
                            <td className="p-2">{row.played}</td>
                            <td className="p-2">{row.wins}</td>
                            <td className="p-2">{row.losses}</td>
                            <td className="p-2">{row.scored}</td>
                            <td className="p-2">{row.conceded}</td>
                            <td className="p-2">{row.difference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h6 className="mt-4 text-xs font-bold text-slate-400 uppercase">
                    Confrontos
                  </h6>
                  <ol className="mt-2 space-y-2 text-sm">
                    {data?.matches
                      .filter((match) => match.group_id === group.id)
                      .map((match) => (
                        <li
                          key={match.id}
                          className="rounded border border-white/10 p-2"
                        >
                          <TournamentMatchResult
                            key={`${match.id}:${match.result_version}`}
                            match={match}
                            labelA={label(match.team_a_id)}
                            labelB={label(match.team_b_id)}
                            canManage={
                              canManage &&
                              !data?.brackets.some(
                                (b) => b.category_id === category.id,
                              )
                            }
                            onSaved={refreshResults}
                          />
                        </li>
                      ))}
                  </ol>
                </article>
              ))}
            </div>
            {data && (
              <TournamentKnockoutPanel
                data={data}
                categoryId={category.id}
                tournamentId={tournamentId}
                canManage={canManage}
                onSaved={refreshResults}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
