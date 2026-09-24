"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useState, type FormEvent } from "react";
import type { Court } from "@/features/courts/service";
import type { Customer } from "@/features/customers/service";
import type { Reservation } from "@/features/reservations/service";
import type { ReservationKind } from "@/features/reservations/validation";

type Slot = { startAt: string; endAt: string; available: boolean };
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function localParts(instant: string, timezone: string) {
  const local = Temporal.Instant.from(instant).toZonedDateTimeISO(timezone);
  return {
    date: local.toPlainDate().toString(),
    time: `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
  };
}

export function ReservationModal({
  courts,
  timezone,
  initialDate,
  reservation,
  onClose,
  onSaved,
}: {
  courts: Court[];
  timezone: string;
  initialDate: string;
  reservation?: Reservation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const originalStart = reservation
    ? localParts(reservation.startAt, timezone)
    : null;
  const originalDuration = reservation
    ? Number(
        Temporal.Instant.from(reservation.endAt)
          .since(Temporal.Instant.from(reservation.startAt))
          .total("minutes"),
      )
    : 60;
  const [kind, setKind] = useState<ReservationKind>(
    reservation?.kind ?? "booking",
  );
  const [courtId, setCourtId] = useState(
    reservation?.courtId ??
      courts.find((court) => court.status === "available")?.id ??
      "",
  );
  const [date, setDate] = useState(originalStart?.date ?? initialDate);
  const [duration, setDuration] = useState(originalDuration);
  const [startTime, setStartTime] = useState(originalStart?.time ?? "");
  const [notes, setNotes] = useState(reservation?.notes ?? "");
  const [customerQuery, setCustomerQuery] = useState(
    reservation?.customerName ?? "",
  );
  const [customerId, setCustomerId] = useState(reservation?.customerId ?? "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!courtId || !date) return;
    const controller = new AbortController();
    fetch(`/api/availability?${new URLSearchParams({ courtId, date })}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Não foi possível consultar a disponibilidade.");
        return (await response.json()) as { slots: Slot[] };
      })
      .then((result) => {
        setSlots(result.slots);
        setAvailabilityError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setAvailabilityError("Não foi possível consultar a disponibilidade.");
      });
    return () => controller.abort();
  }, [courtId, date]);

  useEffect(() => {
    if (kind !== "booking") return;
    const controller = new AbortController();
    fetch(
      `/api/customers?${new URLSearchParams({ q: customerQuery, status: "active", page: "1" })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { items: Customer[] };
      })
      .then((result) => setCustomers(result.items))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setCustomers([]);
      });
    return () => controller.abort();
  }, [kind, customerQuery]);

  const court = courts.find((item) => item.id === courtId);
  const availableStarts = slots.filter((slot) => {
    const end = Temporal.Instant.from(slot.startAt).add({ minutes: duration });
    const covered = slots.filter(
      (part) =>
        Temporal.Instant.compare(
          Temporal.Instant.from(part.startAt),
          Temporal.Instant.from(slot.startAt),
        ) >= 0 &&
        Temporal.Instant.compare(Temporal.Instant.from(part.endAt), end) <= 0,
    );
    return (
      covered.length === duration / 30 &&
      covered.every(
        (part) =>
          part.available ||
          (reservation &&
            courtId === reservation.courtId &&
            Temporal.Instant.compare(
              Temporal.Instant.from(part.startAt),
              Temporal.Instant.from(reservation.startAt),
            ) >= 0 &&
            Temporal.Instant.compare(
              Temporal.Instant.from(part.endAt),
              Temporal.Instant.from(reservation.endAt),
            ) <= 0),
      )
    );
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!courtId || !startTime || (kind === "booking" && !customerId)) {
      setError("Selecione quadra, horário e cliente.");
      return;
    }
    setBusy(true);
    try {
      const startAt = Temporal.PlainDateTime.from(`${date}T${startTime}`)
        .toZonedDateTime(timezone)
        .toInstant();
      const endAt = startAt.add({ minutes: duration });
      const body = reservation
        ? {
            courtId,
            customerId: kind === "booking" ? customerId : null,
            startAt: startAt.toString(),
            endAt: endAt.toString(),
            notes: notes.trim() || null,
          }
        : {
            kind,
            courtId,
            customerId: kind === "booking" ? customerId : null,
            startAt: startAt.toString(),
            endAt: endAt.toString(),
            notes: notes.trim() || null,
          };
      const response = await fetch(
        reservation
          ? `/api/reservations/${reservation.id}`
          : "/api/reservations",
        {
          method: reservation ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(result.error?.message ?? "Não foi possível salvar a reserva.");
        return;
      }
      onSaved();
    } catch {
      setError("Falha ao salvar. Confira a data e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle =
    "mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 outline-none focus:border-lime-400";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={reservation ? "Editar reserva" : "Nova reserva"}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            {reservation ? "Editar reserva" : "Nova reserva ou bloqueio"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-4">
          {!reservation && (
            <label className="block text-sm font-medium">
              Tipo
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as ReservationKind)
                }
                className={inputStyle}
              >
                <option value="booking">Reserva</option>
                <option value="block">Bloqueio de horário</option>
              </select>
            </label>
          )}
          <label className="block text-sm font-medium">
            Quadra
            <select
              required
              value={courtId}
              onChange={(event) => {
                setCourtId(event.target.value);
                setStartTime("");
                setSlots([]);
              }}
              className={inputStyle}
            >
              <option value="">Selecione</option>
              {courts
                .filter(
                  (item) =>
                    item.status === "available" ||
                    item.id === reservation?.courtId,
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          {kind === "booking" && (
            <div>
              <label className="block text-sm font-medium">
                Buscar cliente
                <input
                  type="search"
                  value={customerQuery}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value);
                    setCustomerId("");
                  }}
                  placeholder="Nome do cliente"
                  className={inputStyle}
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Cliente
                <select
                  required
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className={inputStyle}
                >
                  <option value="">Selecione um cliente ativo</option>
                  {reservation?.customerId &&
                    !customers.some(
                      (item) => item.id === reservation.customerId,
                    ) && (
                      <option value={reservation.customerId}>
                        {reservation.customerName ?? "Cliente atual"}
                      </option>
                    )}
                  {customers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Data
              <input
                required
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setStartTime("");
                  setSlots([]);
                }}
                className={inputStyle}
              />
            </label>
            <label className="block text-sm font-medium">
              Duração
              <select
                value={duration}
                onChange={(event) => {
                  setDuration(Number(event.target.value));
                  setStartTime("");
                }}
                className={inputStyle}
              >
                {Array.from({ length: 24 }, (_, i) => (i + 1) * 30).map(
                  (minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes / 60} h
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Início
            <select
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className={inputStyle}
            >
              <option value="">Selecione um horário livre</option>
              {availableStarts.map((slot) => {
                const time = localParts(slot.startAt, timezone).time;
                return (
                  <option key={slot.startAt} value={time}>
                    {time}
                  </option>
                );
              })}
              {reservation &&
                startTime &&
                !availableStarts.some(
                  (slot) =>
                    localParts(slot.startAt, timezone).time === startTime,
                ) && <option value={startTime}>{startTime} (atual)</option>}
            </select>
          </label>
          {availabilityError && (
            <p role="alert" className="text-sm text-rose-300">
              {availabilityError}
            </p>
          )}
          {court && kind === "booking" && (
            <p className="text-sm text-slate-400">
              Preço estimado:{" "}
              {money.format(
                Math.round(((court.pricePerHour * duration) / 60) * 100) / 100,
              )}
              . O valor final é calculado no banco.
            </p>
          )}
          <label className="block text-sm font-medium">
            Observações
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={inputStyle}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || !!availabilityError}
              className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300 disabled:opacity-60"
            >
              {busy ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
