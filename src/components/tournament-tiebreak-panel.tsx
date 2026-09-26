"use client";
import { useState } from "react";
import type { TournamentDraw } from "@/features/tournaments/service";
import { groupStandings } from "@/features/tournaments/standings";

export function TournamentTiebreakPanel({
  data,
  group,
  canManage,
  onSaved,
}: {
  data: TournamentDraw;
  group: TournamentDraw["groups"][number];
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const entries = data.entries.filter((e) => e.group_id === group.id);
  const matches = data.matches.filter((m) => m.group_id === group.id);
  const base = groupStandings(entries, matches);
  const decision = data.tiebreaks.find((t) => t.group_id === group.id);
  const [order, setOrder] = useState(() =>
    groupStandings(entries, matches, decision?.team_ids).map((r) => r.teamId),
  );
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<TournamentDraw["tiebreaks"] | null>(
    null,
  );
  const pending = matches.some((m) => m.score_a === null);
  const tied = new Set(base.map((r) => r.rank)).size < base.length;
  const locked = data.brackets.some((b) => b.category_id === group.category_id);
  const path = `/api/tournaments/${group.tournament_id}/groups/${group.id}/tiebreak`;
  const label = (id: string) =>
    entries.find((e) => e.team_id === id)?.team_label ?? "Dupla";
  const rank = (id: string) => base.find((r) => r.teamId === id)?.rank;
  function move(index: number, step: number) {
    const target = index + step;
    if (
      target < 0 ||
      target >= order.length ||
      rank(order[index]) !== rank(order[target])
    )
      return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamIds: order,
          reason,
          expectedVersion: group.standings_version,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Falha ao registrar desempate.");
      await onSaved();
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao registrar.");
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Falha ao consultar histórico.");
      setHistory(body.history);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao consultar histórico.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 rounded border border-white/10 p-3 text-sm">
      <h6 className="font-semibold">Desempate</h6>
      {decision && (
        <p className="mt-2 text-lime-300">
          Ordem definida pelo gestor: {decision.reason}
        </p>
      )}
      {tied && !decision && (
        <p className="mt-2 text-amber-300">
          Há duplas empatadas. O gestor pode definir a ordem com base no
          regulamento da competição.
        </p>
      )}
      {pending && (
        <p className="mt-2 text-xs text-slate-400">
          Conclua os jogos do grupo antes de decidir.
        </p>
      )}
      {locked && (
        <p className="mt-2 text-xs text-slate-400">
          Decisão bloqueada: a eliminatória já foi gerada.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-3">
        {canManage && tied && !pending && !locked && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(!editing)}
            className="text-lime-300 underline"
          >
            {editing
              ? "Fechar edição"
              : decision
                ? "Revisar desempate"
                : "Resolver empate"}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (history) setHistory(null);
            else void loadHistory();
          }}
          className="text-slate-300 underline"
        >
          {history ? "Ocultar histórico" : "Histórico de desempates"}
        </button>
      </div>
      {editing && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="text-xs text-slate-400">
            Use subir/descer para ordenar apenas as duplas empatadas. Registre o
            critério aplicado na justificativa. Corrigir qualquer placar do
            grupo invalida esta decisão.
          </p>
          <ol className="space-y-2">
            {order.map((id, i) => (
              <li
                key={id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {i + 1}. {label(id)}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Subir ${label(id)}`}
                    disabled={
                      busy || i === 0 || rank(id) !== rank(order[i - 1])
                    }
                    onClick={() => move(i, -1)}
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${label(id)}`}
                    disabled={
                      busy ||
                      i === order.length - 1 ||
                      rank(id) !== rank(order[i + 1])
                    }
                    onClick={() => move(i, 1)}
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-30"
                  >
                    Descer
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <label className="block">
            Justificativa
            <input
              required
              minLength={3}
              maxLength={200}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-white/20 bg-slate-900 p-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded bg-lime-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            Salvar desempate
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-rose-300">
          {error}{" "}
          <button
            type="button"
            onClick={() =>
              void onSaved().catch(() =>
                setError("Falha ao atualizar. Recarregue a página."),
              )
            }
            className="underline"
          >
            Atualizar grupo
          </button>
        </p>
      )}
      {history && (
        <div className="mt-3 text-xs text-slate-300">
          <p>Últimas 50 decisões</p>
          {history.length === 0 && <p>Nenhuma decisão registrada.</p>}
          <ol className="mt-2 space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.status === "active"
                    ? "Vigente"
                    : item.status === "superseded"
                      ? "Substituída"
                      : "Invalidada por alteração de placar"}
                </strong>{" "}
                · {new Date(item.recorded_at).toLocaleString("pt-BR")}
                <p>
                  {item.team_ids
                    .map((id, i) => `${i + 1}. ${label(id)}`)
                    .join("; ")}
                </p>
                <p>{item.reason}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
