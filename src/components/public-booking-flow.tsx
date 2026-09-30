"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  PublicArena,
  PublicBrand,
  PublicRequestStatus,
  PublicSlot,
} from "@/features/public-bookings/types";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function time(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function fullDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: timezone,
  }).format(new Date(value));
}

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function readJson(response: Response) {
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "Não foi possível concluir a operação.",
    );
  return result;
}

const statusCopy = {
  pending: {
    title: "Pedido enviado",
    text: "A arena recebeu sua solicitação. Volte aqui para acompanhar a confirmação.",
    tone: "border-amber-300/30 bg-amber-200/10 text-amber-100",
  },
  approved: {
    title: "Reserva confirmada",
    text: "Seu horário foi aprovado pela arena.",
    tone: "border-emerald-300/30 bg-emerald-200/10 text-emerald-100",
  },
  declined: {
    title: "Pedido não aprovado",
    text: "A arena não conseguiu confirmar este horário.",
    tone: "border-rose-300/30 bg-rose-200/10 text-rose-100",
  },
  expired: {
    title: "Pedido expirado",
    text: "O horário passou sem confirmação. Faça uma nova solicitação.",
    tone: "border-slate-300/30 bg-slate-200/10 text-slate-100",
  },
} as const;

export function PublicBookingFlow({
  initialArena,
  brand,
}: {
  initialArena: PublicArena;
  brand: PublicBrand;
}) {
  const storageKey = `minha-quadra:pedido:v1:${initialArena.slug}`;
  const [arena, setArena] = useState(initialArena);
  const [courtId, setCourtId] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialArena.today);
  const [selectedSlot, setSelectedSlot] = useState<PublicSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [busySlots, setBusySlots] = useState(false);
  const [busySubmit, setBusySubmit] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] =
    useState<PublicRequestStatus | null>(null);

  const selectedCourt = useMemo(
    () => arena.courts.find((court) => court.id === courtId) ?? null,
    [arena.courts, courtId],
  );

  async function refreshStatus(token: string) {
    setBusyStatus(true);
    setError("");
    try {
      const result = await readJson(
        await fetch(
          `/api/public-bookings/status?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
          },
        ),
      );
      setRequestStatus(result.request);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar o pedido.",
      );
    } finally {
      setBusyStatus(false);
    }
  }

  useEffect(() => {
    const token = window.localStorage.getItem(storageKey);
    if (!token) return;
    let active = true;
    fetch(`/api/public-bookings/status?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(readJson)
      .then((result) => {
        if (active) setRequestStatus(result.request);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar o pedido.",
          );
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!courtId) return;

    const controller = new AbortController();
    async function loadSlots() {
      setBusySlots(true);
      setError("");
      try {
        const query = new URLSearchParams({
          slug: initialArena.slug,
          court: courtId,
          date: selectedDate,
        });
        const result = await readJson(
          await fetch(`/api/public-bookings?${query}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        );
        setArena(result.arena);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError")
          return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar os horários.",
        );
      } finally {
        if (!controller.signal.aborted) setBusySlots(false);
      }
    }
    void loadSlots();
    return () => controller.abort();
  }, [courtId, initialArena.slug, selectedDate]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCourt || !selectedSlot) {
      setError("Escolha uma quadra e um horário.");
      return;
    }

    setBusySubmit(true);
    setError("");
    const token = generateToken();
    try {
      const result = await readJson(
        await fetch("/api/public-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: initialArena.slug,
            courtId: selectedCourt.id,
            startAt: selectedSlot.startAt,
            name,
            phone,
            token,
            website,
          }),
        }),
      );
      window.localStorage.setItem(storageKey, token);
      setRequestStatus(result.request);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível enviar o pedido.",
      );
    } finally {
      setBusySubmit(false);
    }
  }

  function newRequest() {
    window.localStorage.removeItem(storageKey);
    setRequestStatus(null);
    setCourtId("");
    setSelectedDate(initialArena.today);
    setSelectedSlot(null);
    setError("");
  }

  const whatsappUrl = brand.whatsapp
    ? `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(`Olá! Estou entrando em contato pela página de reservas da ${brand.name}.`)}`
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#061e19] text-white">
      <div aria-hidden="true" className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/2 h-full w-px bg-white/15" />
        <div className="absolute top-1/2 left-0 h-px w-full bg-white/15" />
        <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-start justify-between gap-5 border-b border-white/15 pb-6">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.26em] text-[#d8c29a] uppercase">
              Reserva direta
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">
              {brand.name}
            </h1>
            {brand.address && (
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                {brand.address}
              </p>
            )}
          </div>
          <div className="rounded-full border border-[#d8c29a]/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#d8c29a] uppercase">
            Minha Quadra
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          >
            {error}
          </p>
        )}

        {requestStatus ? (
          <section className="mx-auto my-auto w-full max-w-2xl py-12">
            <div
              className={`rounded-3xl border p-6 sm:p-9 ${statusCopy[requestStatus.status].tone}`}
            >
              <p className="font-mono text-xs tracking-[0.2em] uppercase">
                Situação do pedido
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.05em]">
                {statusCopy[requestStatus.status].title}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 opacity-80">
                {statusCopy[requestStatus.status].text}
              </p>
              <dl className="mt-8 grid gap-5 border-t border-current/20 pt-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs opacity-65">Quadra</dt>
                  <dd className="mt-1 font-semibold">{requestStatus.court}</dd>
                </div>
                <div>
                  <dt className="text-xs opacity-65">Data e horário</dt>
                  <dd className="mt-1 font-semibold">
                    {fullDate(requestStatus.startAt, requestStatus.timezone)} ·{" "}
                    {time(requestStatus.startAt, requestStatus.timezone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs opacity-65">Valor informado</dt>
                  <dd className="mt-1 font-semibold">
                    {money(requestStatus.price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs opacity-65">Código</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {requestStatus.id.slice(0, 8).toUpperCase()}
                  </dd>
                </div>
              </dl>
              {requestStatus.declineReason && (
                <div className="mt-6 rounded-xl bg-black/15 p-4">
                  <p className="text-xs opacity-65">
                    Motivo informado pela arena
                  </p>
                  <p className="mt-1 text-sm">{requestStatus.declineReason}</p>
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                {requestStatus.status === "pending" && (
                  <button
                    type="button"
                    disabled={busyStatus}
                    onClick={() => {
                      const token = window.localStorage.getItem(storageKey);
                      if (token) void refreshStatus(token);
                    }}
                    className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#073629] disabled:opacity-60"
                  >
                    {busyStatus ? "Atualizando…" : "Atualizar situação"}
                  </button>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-current/30 px-5 py-3 text-sm font-semibold"
                  >
                    Falar com a arena
                  </a>
                )}
                {requestStatus.status !== "pending" && (
                  <button
                    type="button"
                    onClick={newRequest}
                    className="rounded-full border border-current/30 px-5 py-3 text-sm font-semibold"
                  >
                    Fazer novo pedido
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-16">
            <section className="lg:sticky lg:top-8">
              <p className="font-mono text-xs tracking-[0.22em] text-[#d8c29a] uppercase">
                Escolha. Envie. Aguarde.
              </p>
              <h2 className="mt-5 max-w-xl text-5xl leading-[0.96] font-bold tracking-[-0.07em] sm:text-6xl">
                Seu próximo jogo começa aqui.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                Consulte a agenda em tempo real e envie o pedido. A reserva só
                fica confirmada depois da aprovação da arena.
              </p>
              {brand.playerInstructions && (
                <div className="mt-8 border-l-2 border-[#d8c29a] pl-4">
                  <p className="text-xs font-semibold tracking-wide text-[#d8c29a] uppercase">
                    Antes de reservar
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {brand.playerInstructions}
                  </p>
                </div>
              )}
            </section>

            <form
              onSubmit={submit}
              className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur sm:p-8"
            >
              <fieldset>
                <legend className="text-lg font-bold">1. Quadra e data</legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    Quadra
                    <select
                      required
                      value={courtId}
                      onChange={(event) => {
                        setCourtId(event.target.value);
                        setSelectedSlot(null);
                      }}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b352c] px-4 py-3.5 text-white"
                    >
                      <option value="">Selecione</option>
                      {arena.courts.map((court) => (
                        <option key={court.id} value={court.id}>
                          {court.name} · {court.sport}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    Data
                    <input
                      required
                      type="date"
                      min={arena.today}
                      max={arena.maxDate}
                      value={selectedDate}
                      onChange={(event) => {
                        setSelectedDate(event.target.value);
                        setSelectedSlot(null);
                      }}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b352c] px-4 py-3 text-white [color-scheme:dark]"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="mt-8 border-t border-white/10 pt-7">
                <legend className="text-lg font-bold">2. Horário</legend>
                {!courtId ? (
                  <p className="mt-4 rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-slate-400">
                    Selecione uma quadra para ver os horários.
                  </p>
                ) : busySlots ? (
                  <p className="mt-4 py-6 text-center text-sm text-slate-300">
                    Consultando agenda…
                  </p>
                ) : arena.slots.length ? (
                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {arena.slots.map((slot) => {
                      const active = selectedSlot?.startAt === slot.startAt;
                      return (
                        <button
                          type="button"
                          key={slot.startAt}
                          aria-pressed={active}
                          onClick={() => setSelectedSlot(slot)}
                          className={`rounded-xl border px-3 py-3 font-mono text-sm font-semibold transition ${
                            active
                              ? "border-[#d8c29a] bg-[#d8c29a] text-[#073629]"
                              : "border-white/15 bg-black/10 text-white hover:border-white/40"
                          }`}
                        >
                          {time(slot.startAt, arena.timezone)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-slate-400">
                    Não há horários livres nesta data.
                  </p>
                )}
              </fieldset>

              <fieldset className="mt-8 border-t border-white/10 pt-7">
                <legend className="text-lg font-bold">3. Seus dados</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    Nome
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b352c] px-4 py-3 text-white placeholder:text-slate-500"
                      placeholder="Como podemos chamar você?"
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    WhatsApp
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b352c] px-4 py-3 text-white placeholder:text-slate-500"
                      placeholder="(31) 99999-9999"
                    />
                  </label>
                </div>
                <label className="absolute -left-[9999px]" aria-hidden="true">
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </label>
              </fieldset>

              <div className="mt-8 rounded-2xl bg-black/20 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Valor informado pela arena
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {selectedCourt ? money(selectedCourt.price) : "—"}
                    {selectedCourt && (
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        / 1 hora
                      </span>
                    )}
                  </p>
                </div>
                <button
                  disabled={busySubmit || !selectedCourt || !selectedSlot}
                  className="mt-4 w-full rounded-full bg-[#d8c29a] px-6 py-3.5 font-bold text-[#073629] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto"
                >
                  {busySubmit ? "Enviando…" : "Enviar pedido"}
                </button>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                Este envio não realiza cobrança e ainda não confirma a reserva.
              </p>
            </form>
          </div>
        )}

        <footer className="border-t border-white/15 py-5 text-center text-xs text-slate-500">
          Agenda pública protegida por Minha Quadra.
        </footer>
      </div>
    </main>
  );
}
