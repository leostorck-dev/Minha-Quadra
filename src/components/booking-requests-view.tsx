"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BookingRequest = {
  id: string;
  playerName: string;
  playerPhone: string;
  startAt: string;
  endAt: string;
  price: number;
  status: string;
  declineReason: string | null;
  reservationId: string | null;
  decidedAt: string | null;
  createdAt: string;
  courtName: string;
};

const labels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  declined: "Recusada",
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function phone(value: string) {
  const local = value.startsWith("55") ? value.slice(2) : value;
  return local.length === 11
    ? `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    : value;
}

function dateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

export function BookingRequestsView({
  requests: initialRequests,
  timezone,
}: {
  requests: BookingRequest[];
  timezone: string;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const items = useMemo(
    () =>
      requests.filter((item) =>
        tab === "pending"
          ? item.status === "pending"
          : item.status !== "pending",
      ),
    [requests, tab],
  );
  const pendingCount = requests.filter(
    (item) => item.status === "pending",
  ).length;

  async function decide(item: BookingRequest, approve: boolean) {
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/booking-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          approve,
          reason: approve ? "" : reason,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Não foi possível registrar a decisão.",
        );
      setRequests((current) =>
        current.map((request) =>
          request.id === item.id
            ? {
                ...request,
                status: approve ? "approved" : "declined",
                declineReason: approve ? null : reason.trim(),
                reservationId: result.reservationId,
                decidedAt: new Date().toISOString(),
              }
            : request,
        ),
      );
      setDecliningId(null);
      setReason("");
      setMessage(
        approve
          ? "Pedido aprovado e reserva criada na agenda."
          : "Pedido recusado. O motivo já pode ser consultado pelo jogador.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registrar a decisão.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div>
          <p className="text-sm text-lime-400">Agenda pública</p>
          <h1 className="mt-2 text-3xl font-bold">Solicitações de reserva</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Confira o horário antes de aprovar. A aprovação cria o cliente e a
            reserva automaticamente.
          </p>
        </div>
        <Link
          href="/settings"
          className="mt-4 inline-flex rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 sm:mt-0"
        >
          Configurar página
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-950 px-4 py-3 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-lime-950 px-4 py-3 text-sm text-lime-200"
        >
          {message}
        </p>
      )}

      <div className="inline-flex rounded-xl border border-white/10 bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "pending" ? "bg-[#d8c29a] text-[#0b3f34]" : "text-slate-300"
          }`}
        >
          Pendentes {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            tab === "history" ? "bg-[#d8c29a] text-[#0b3f34]" : "text-slate-300"
          }`}
        >
          Histórico
        </button>
      </div>

      {items.length ? (
        <div className="grid gap-4">
          {items.map((item) => {
            const expired =
              item.status === "pending" && new Date(item.startAt) <= new Date();
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6"
              >
                <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {item.playerName}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          expired
                            ? "bg-slate-700 text-slate-200"
                            : item.status === "approved"
                              ? "bg-lime-400/15 text-lime-300"
                              : item.status === "declined"
                                ? "bg-rose-400/15 text-rose-300"
                                : "bg-amber-400/15 text-amber-200"
                        }`}
                      >
                        {expired
                          ? "Expirada"
                          : (labels[item.status] ?? item.status)}
                      </span>
                    </div>
                    <a
                      href={`https://wa.me/${item.playerPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm text-lime-400 hover:underline"
                    >
                      {phone(item.playerPhone)}
                    </a>
                    <p className="mt-2 text-xs text-slate-500">
                      Pedido em {dateTime(item.createdAt, timezone)}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Quadra</dt>
                      <dd className="mt-1 font-medium">{item.courtName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Valor</dt>
                      <dd className="mt-1 font-medium">{money(item.price)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-slate-500">Horário</dt>
                      <dd className="mt-1 font-medium">
                        {dateTime(item.startAt, timezone)}
                      </dd>
                    </div>
                  </dl>
                  {item.status === "pending" && !expired && (
                    <div className="flex gap-2 lg:flex-col">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void decide(item, true)}
                        className="flex-1 rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setDecliningId(item.id);
                          setReason("");
                        }}
                        className="flex-1 rounded-lg border border-rose-300/30 px-5 py-2.5 text-sm font-semibold text-rose-200 disabled:opacity-50"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>

                {decliningId === item.id && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <label className="block text-sm">
                      Motivo para o jogador
                      <textarea
                        autoFocus
                        required
                        minLength={5}
                        maxLength={240}
                        rows={2}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Ex.: A quadra ficará em manutenção neste horário."
                        className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-slate-800 px-4 py-3"
                      />
                    </label>
                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        disabled={
                          busyId === item.id || reason.trim().length < 5
                        }
                        onClick={() => void decide(item, false)}
                        className="rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Confirmar recusa
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => setDecliningId(null)}
                        className="rounded-lg px-4 py-2.5 text-sm text-slate-300 hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {item.declineReason && (
                  <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-400">
                    <span className="font-semibold text-slate-300">
                      Motivo:
                    </span>{" "}
                    {item.declineReason}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 px-6 py-14 text-center">
          <p className="font-semibold">
            {tab === "pending"
              ? "Nenhuma solicitação pendente."
              : "O histórico ainda está vazio."}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {tab === "pending"
              ? "Novos pedidos enviados pela página pública aparecerão aqui."
              : "As decisões tomadas ficarão registradas nesta área."}
          </p>
        </div>
      )}
    </section>
  );
}
