"use client";

import { useEffect, useState } from "react";
import type { CustomerReservationHistoryItem } from "@/features/customers/reservation-history";

type History = {
  items: CustomerReservationHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  timezone: string;
};

const statusLabels = {
  pending: "Pendente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};
const paymentLabels = {
  pending: "Pendente",
  paid: "Pago",
  refunded: "Estornado",
  cancelled: "Cancelado",
  free: "Sem cobrança",
};
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function CustomerReservationHistory({
  customerId,
}: {
  customerId: string;
}) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: History;
    error?: string;
  } | null>(null);
  const key = JSON.stringify([customerId, page, retry]);
  const loading = result?.key !== key;
  const data = loading ? null : result.data;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/customers/${customerId}/reservations?page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível carregar as reservas do cliente.");
        return (await response.json()) as History;
      })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error: "Não foi possível carregar as reservas do cliente.",
          });
      });
    return () => controller.abort();
  }, [customerId, page, retry, key]);

  const dateTime = data
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: data.timezone,
      })
    : null;
  const time = data
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: data.timezone,
      })
    : null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold">Reservas do cliente</h2>
        {data && (
          <span className="text-xs text-slate-400">
            {data.total} no histórico
          </span>
        )}
      </div>
      {loading ? (
        <p role="status" className="px-5 py-6 text-sm text-slate-400">
          Carregando reservas...
        </p>
      ) : error ? (
        <p role="alert" className="px-5 py-6 text-sm text-rose-300">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="underline"
          >
            Tentar novamente
          </button>
        </p>
      ) : data && data.items.length > 0 ? (
        <ul className="divide-y divide-white/10">
          {data.items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.courtName}</p>
                  <time
                    dateTime={item.startAt}
                    className="mt-1 block text-sm text-slate-300"
                  >
                    {dateTime?.format(new Date(item.startAt))}–
                    {time?.format(new Date(item.endAt))}
                  </time>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
                  {statusLabels[item.status]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {money.format(item.price)} · Cobrança:{" "}
                {paymentLabels[item.paymentSituation]}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-slate-400">
          Nenhuma reserva registrada para este cliente.
        </p>
      )}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {page} de {Math.ceil(data.total / data.pageSize)}
          </span>
          <button
            type="button"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  );
}
