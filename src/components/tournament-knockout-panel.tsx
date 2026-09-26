"use client";
import { useState } from "react";
import type { TournamentDraw } from "@/features/tournaments/service";
import { TournamentMatchResult } from "@/components/tournament-match-result";

export function TournamentKnockoutPanel({
  data,
  categoryId,
  tournamentId,
  canManage,
  onSaved,
}: {
  data: TournamentDraw;
  categoryId: string;
  tournamentId: string;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [qualifiers, setQualifiers] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bracket = data.brackets.find((b) => b.category_id === categoryId);
  const matches = data.knockouts.filter((m) => m.category_id === categoryId);
  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const lastRound = rounds.at(-1);
  const final = matches.find((m) => m.round === lastRound);
  const label = (id: string | null) =>
    data.entries.find((e) => e.team_id === id)?.team_label ??
    "Aguardando vencedor";
  const pending = data.matches.some(
    (m) => m.category_id === categoryId && m.score_a === null,
  );
  async function generate() {
    if (
      !window.confirm(
        "Gerar a chave definitiva? Os resultados dos grupos ficarão bloqueados. O sorteio pode reunir duplas do mesmo grupo e inclui avanços sem adversário quando necessário.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, qualifiers }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Falha ao gerar a chave.");
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao gerar a chave.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-5 rounded-lg border border-lime-400/20 p-4">
      <h5 className="font-semibold">Eliminatórias</h5>
      {!bracket && (
        <>
          <p className="mt-2 text-sm text-slate-400">
            Conclua todos os jogos. Classificam-se 1 ou 2 duplas por grupo pelos
            critérios da tabela. Resolva os empates que afetem a vaga antes de
            gerar a chave. São necessárias pelo menos duas classificadas. A
            chave é sorteada, com avanços sem adversário quando necessário.
          </p>
          {canManage && (
            <form
              className="mt-3 flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void generate();
              }}
            >
              <label className="text-sm">
                Classificadas por grupo
                <select
                  value={qualifiers}
                  onChange={(e) => setQualifiers(Number(e.target.value))}
                  disabled={busy}
                  className="mt-1 block rounded bg-slate-800 p-2"
                >
                  <option value={1}>1 dupla</option>
                  <option value={2}>2 duplas</option>
                </select>
              </label>
              <button
                disabled={busy || pending}
                className="rounded bg-lime-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
              >
                {busy ? "Gerando..." : "Gerar eliminatória"}
              </button>
              {pending && (
                <p className="text-sm text-amber-300">
                  Há jogos dos grupos sem resultado.
                </p>
              )}
            </form>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {bracket && (
        <p className="mt-2 text-xs text-slate-400">
          {bracket.qualifiers_per_group} classificada(s) por grupo. Resultados
          dos grupos bloqueados. Para corrigir uma partida, anule primeiro os
          resultados das rodadas seguintes.
        </p>
      )}
      {final?.winner_id && (
        <p
          role="status"
          className="mt-4 rounded bg-lime-400/10 p-3 font-bold text-lime-300"
        >
          Campeã da categoria: {label(final.winner_id)}
        </p>
      )}
      <div className="mt-4 flex gap-4 overflow-x-auto pb-3">
        {rounds.map((round) => (
          <section
            key={round}
            className="min-w-72 flex-1 rounded bg-slate-800 p-3"
          >
            <h6 className="font-semibold">
              {round === lastRound
                ? "Final"
                : round === (lastRound ?? 0) - 1
                  ? "Semifinal"
                  : `Rodada ${round}`}
            </h6>
            <ol className="mt-3 space-y-3">
              {matches
                .filter((m) => m.round === round)
                .map((m) => (
                  <li
                    key={m.id}
                    className="rounded border border-white/10 p-3 text-sm"
                  >
                    <p className="mb-2 text-xs text-slate-400">
                      Jogo {m.position}
                    </p>
                    {m.round === 1 && m.winner_id && m.team_b_id === null ? (
                      <p>
                        {label(m.winner_id)}
                        <span className="mt-1 block text-lime-300">
                          Avanço sem adversário
                        </span>
                      </p>
                    ) : (
                      <TournamentMatchResult
                        key={`${m.id}:${m.result_version}`}
                        match={m}
                        labelA={label(m.team_a_id)}
                        labelB={label(m.team_b_id)}
                        canManage={canManage && !!m.team_a_id && !!m.team_b_id}
                        knockout
                        onSaved={onSaved}
                      />
                    )}
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
