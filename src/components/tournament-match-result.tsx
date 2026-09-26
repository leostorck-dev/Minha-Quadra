"use client";
import { useState } from "react";
import type { TournamentDraw } from "@/features/tournaments/service";
type History = {
  version: number;
  score_a: number | null;
  score_b: number | null;
  reason: string;
  recorded_at: string;
};

export function TournamentMatchResult({
  match,
  labelA,
  labelB,
  canManage,
  onSaved,
}: {
  match: TournamentDraw["matches"][number];
  labelA: string;
  labelB: string;
  canManage: boolean;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.score_a?.toString() ?? "");
  const [scoreB, setScoreB] = useState(match.score_b?.toString() ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<History[] | null>(null);
  const path = `/api/tournaments/${match.tournament_id}/matches/${match.id}/result`;
  async function save(clear = false) {
    if (
      clear &&
      !window.confirm(
        "Anular o resultado e devolver a partida para pendente? O histórico será preservado.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreA: clear ? null : scoreA === "" ? "" : Number(scoreA),
          scoreB: clear ? null : scoreB === "" ? "" : Number(scoreB),
          expectedVersion: match.result_version,
          reason,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Falha ao salvar.");
      await onSaved();
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
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
        throw new Error(body.error?.message ?? "Falha ao carregar histórico.");
      setHistory(body.history);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao carregar histórico.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p>
        {labelA}{" "}
        <strong className="text-lime-300">
          {match.score_a === null ? "×" : `${match.score_a} × ${match.score_b}`}
        </strong>{" "}
        {labelB}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {match.score_a === null ? "Resultado pendente" : "Resultado registrado"}
      </p>
      <div className="mt-2 flex gap-3">
        {canManage && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(!editing)}
            className="text-lime-300 underline disabled:opacity-50"
          >
            {editing
              ? "Fechar edição"
              : match.score_a === null
                ? "Lançar resultado"
                : "Corrigir / anular"}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (history) setHistory(null);
            else void loadHistory();
          }}
          className="text-slate-300 underline disabled:opacity-50"
        >
          {history ? "Ocultar histórico" : "Histórico"}
        </button>
      </div>
      {editing && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label>
              {labelA}
              <input
                aria-label={`Placar de ${labelA}`}
                type="number"
                min={0}
                max={99}
                step={1}
                required
                value={scoreA}
                disabled={busy}
                onChange={(e) => setScoreA(e.target.value)}
                className="mt-1 w-full rounded border border-white/20 bg-slate-900 p-2"
              />
            </label>
            <label>
              {labelB}
              <input
                aria-label={`Placar de ${labelB}`}
                type="number"
                min={0}
                max={99}
                step={1}
                required
                value={scoreB}
                disabled={busy}
                onChange={(e) => setScoreB(e.target.value)}
                className="mt-1 w-full rounded border border-white/20 bg-slate-900 p-2"
              />
            </label>
          </div>
          <label className="block">
            Justificativa / observação
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
          <div className="flex gap-3">
            <button
              disabled={busy}
              className="rounded bg-lime-400 px-3 py-2 font-semibold text-slate-950 disabled:opacity-50"
            >
              Salvar resultado
            </button>
            {match.score_a !== null && (
              <button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={() => void save(true)}
                className="rounded border border-rose-400/40 px-3 py-2 text-rose-300 disabled:opacity-50"
              >
                Anular resultado
              </button>
            )}
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-rose-300">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              void onSaved().catch(() =>
                setError("Falha ao atualizar. Recarregue a página."),
              );
            }}
          >
            Atualizar confrontos
          </button>
        </p>
      )}
      {history && (
        <div className="mt-3 text-xs text-slate-300">
          <p>Últimas 50 alterações</p>
          <ul className="mt-2 space-y-2">
            {history.map((item) => (
              <li key={item.version}>
                Versão {item.version} ·{" "}
                {new Date(item.recorded_at).toLocaleString("pt-BR")} ·{" "}
                {item.score_a === null
                  ? "Anulado"
                  : `${item.score_a} × ${item.score_b}`}
                <br />
                {item.reason}
              </li>
            ))}
          </ul>
          {!history.length && <p>Nenhum resultado registrado.</p>}
        </div>
      )}
    </div>
  );
}
