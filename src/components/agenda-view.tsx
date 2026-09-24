"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useState } from "react";
import { ReservationModal } from "@/components/reservation-modal";
import { PaymentPanel } from "@/components/payment-panel";
import type { Court } from "@/features/courts/service";
import type { Reservation } from "@/features/reservations/service";
import type { ReservationStatus } from "@/features/reservations/validation";

const labels: Record<ReservationStatus, string> = {
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
} as const;
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function localTime(instant: string, timezone: string) {
  const date = Temporal.Instant.from(instant).toZonedDateTimeISO(timezone);
  return `${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}`;
}

export function AgendaView({
  courts,
  timezone,
  canWrite,
}: {
  courts: Court[];
  timezone: string;
  canWrite: boolean;
}) {
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(() =>
    Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString(),
  );
  const [courtId, setCourtId] = useState("");
  const [status, setStatus] = useState("all");
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items?: Reservation[];
    error?: string;
  } | null>(null);
  const [modal, setModal] = useState<"new" | Reservation | null>(null);
  const [paymentReservation, setPaymentReservation] =
    useState<Reservation | null>(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");

  const selectedDate = Temporal.PlainDate.from(date);
  const firstDay =
    view === "week"
      ? selectedDate.subtract({ days: selectedDate.dayOfWeek - 1 })
      : selectedDate;
  const lastDay = firstDay.add({ days: view === "week" ? 7 : 1 });
  const from = firstDay
    .toPlainDateTime("00:00")
    .toZonedDateTime(timezone)
    .toInstant()
    .toString();
  const to = lastDay
    .toPlainDateTime("00:00")
    .toZonedDateTime(timezone)
    .toInstant()
    .toString();
  const requestKey = JSON.stringify([from, to, courtId, status, reload]);
  const loading = result?.key !== requestKey;
  const items = loading ? [] : (result.items ?? []);
  const error = loading ? "" : (result.error ?? "");
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) =>
    firstDay.add({ days: i }),
  );

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ from, to, status });
    if (courtId) params.set("courtId", courtId);
    fetch(`/api/reservations?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { items: Reservation[] };
      })
      .then((data) => setResult({ key: requestKey, items: data.items }))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setResult({
          key: requestKey,
          error: "Não foi possível carregar a agenda.",
        });
      });
    return () => controller.abort();
  }, [from, to, courtId, status, reload, requestKey]);

  function move(days: number) {
    setDate(selectedDate.add({ days }).toString());
  }

  async function changeStatus(
    reservation: Reservation,
    next: ReservationStatus,
  ) {
    if (
      next === "cancelled" &&
      !window.confirm("Cancelar esta reserva ou bloqueio?")
    )
      return;
    setBusyId(reservation.id);
    setActionError("");
    try {
      const response = await fetch(`/api/reservations/${reservation.id}`, {
        method: next === "cancelled" ? "DELETE" : "PATCH",
        headers:
          next === "cancelled"
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          next === "cancelled" ? undefined : JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: { message: string } };
        throw new Error(
          body.error?.message ?? "Não foi possível alterar a reserva.",
        );
      }
      setReload((value) => value + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar a reserva.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-lime-400">Operação</p>
          <h1 className="mt-2 text-3xl font-bold">Agenda</h1>
          <p className="mt-2 text-sm text-slate-400">
            Horários em {timezone.replaceAll("_", " ")}.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => setModal("new")}
            className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300"
          >
            Nova reserva
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <div className="flex rounded-lg border border-white/15 p-1">
          <button
            type="button"
            onClick={() => setView("day")}
            aria-pressed={view === "day"}
            className={`rounded-md px-3 py-2 text-sm ${view === "day" ? "bg-lime-400 text-slate-950" : "text-slate-300"}`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            aria-pressed={view === "week"}
            className={`rounded-md px-3 py-2 text-sm ${view === "week" ? "bg-lime-400 text-slate-950" : "text-slate-300"}`}
          >
            Semana
          </button>
        </div>
        <button
          type="button"
          onClick={() => move(view === "week" ? -7 : -1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm"
        >
          Anterior
        </button>
        <label className="text-xs text-slate-400">
          Data
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value);
            }}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => move(view === "week" ? 7 : 1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm"
        >
          Próximo
        </button>
        <button
          type="button"
          onClick={() =>
            setDate(
              Temporal.Now.zonedDateTimeISO(timezone).toPlainDate().toString(),
            )
          }
          className="rounded-lg border border-white/15 px-3 py-2 text-sm"
        >
          Hoje
        </button>
        <label className="text-xs text-slate-400">
          Quadra
          <select
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">Todas</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todos</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError && (
        <p role="alert" className="mt-5 text-sm text-rose-300">
          {actionError}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-8 text-sm text-slate-400">
          Carregando agenda...
        </p>
      ) : error ? (
        <div role="alert" className="mt-8 text-sm text-rose-300">
          {error}{" "}
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div
          className={`mt-6 grid gap-4 ${view === "week" ? "lg:grid-cols-2 xl:grid-cols-3" : ""}`}
        >
          {days.map((day) => {
            const dayItems = items.filter(
              (item) =>
                Temporal.Instant.from(item.startAt)
                  .toZonedDateTimeISO(timezone)
                  .toPlainDate()
                  .toString() === day.toString(),
            );
            return (
              <div
                key={day.toString()}
                className="min-h-40 rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <h2 className="mb-4 font-semibold capitalize">
                  {day.toLocaleString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </h2>
                {dayItems.length ? (
                  <ul className="space-y-3">
                    {dayItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-slate-800 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {localTime(item.startAt, timezone)}–
                              {localTime(item.endAt, timezone)} ·{" "}
                              {item.courtName}
                            </p>
                            <p className="mt-1 text-sm text-slate-300">
                              {item.kind === "block"
                                ? "Bloqueio"
                                : (item.customerName ?? "Cliente")}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                            {labels[item.status]}
                          </span>
                        </div>
                        {item.kind === "booking" && (
                          <p className="mt-2 text-sm text-slate-400">
                            {money.format(item.price)}
                            {item.paymentSituation &&
                              ` · Pagamento: ${paymentLabels[item.paymentSituation]}`}
                          </p>
                        )}
                        {item.notes && (
                          <p className="mt-2 text-xs text-slate-400">
                            {item.notes}
                          </p>
                        )}
                        {canWrite && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {item.kind === "booking" && (
                              <button
                                type="button"
                                onClick={() => setPaymentReservation(item)}
                                className="rounded-md border border-lime-400/40 px-2 py-1 text-lime-300 hover:bg-white/10"
                              >
                                Pagamento
                              </button>
                            )}
                            {(
                              ["pending", "confirmed"] as ReservationStatus[]
                            ).includes(item.status) && (
                              <button
                                type="button"
                                onClick={() => setModal(item)}
                                className="rounded-md border border-white/15 px-2 py-1 hover:bg-white/10"
                              >
                                Editar
                              </button>
                            )}
                            {item.status === "pending" && (
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => changeStatus(item, "confirmed")}
                                className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-50"
                              >
                                Confirmar
                              </button>
                            )}
                            {item.status === "confirmed" &&
                              item.kind === "booking" && (
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() =>
                                    changeStatus(item, "checked_in")
                                  }
                                  className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-50"
                                >
                                  Check-in
                                </button>
                              )}
                            {item.status === "checked_in" && (
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => changeStatus(item, "completed")}
                                className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-50"
                              >
                                Finalizar
                              </button>
                            )}
                            {item.status === "confirmed" &&
                              item.kind === "booking" && (
                                <button
                                  type="button"
                                  disabled={busyId === item.id}
                                  onClick={() => changeStatus(item, "no_show")}
                                  className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-50"
                                >
                                  Não compareceu
                                </button>
                              )}
                            {(
                              ["pending", "confirmed"] as ReservationStatus[]
                            ).includes(item.status) && (
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => changeStatus(item, "cancelled")}
                                className="rounded-md border border-rose-500/30 px-2 py-1 text-rose-300 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    Sem reservas neste dia.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ReservationModal
          key={modal === "new" ? "new" : modal.id}
          courts={courts}
          timezone={timezone}
          initialDate={date}
          reservation={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setReload((value) => value + 1);
          }}
        />
      )}
      {paymentReservation && (
        <PaymentPanel
          reservation={paymentReservation}
          onClose={() => setPaymentReservation(null)}
          onChanged={() => setReload((value) => value + 1)}
        />
      )}
    </section>
  );
}
