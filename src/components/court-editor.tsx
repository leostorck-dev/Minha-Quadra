"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Court } from "@/features/courts/service";

type CourtResponse = { court: Court; error?: { message: string } };

export function CourtEditor({
  court,
  onSaved,
}: {
  court?: Court;
  onSaved?: (court: Court) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(court?.name ?? "");
  const [sport, setSport] = useState(court?.sport ?? "Futevôlei");
  const [description, setDescription] = useState(court?.description ?? "");
  const [pricePerHour, setPricePerHour] = useState(
    court?.pricePerHour.toFixed(2) ?? "",
  );
  const [openingTime, setOpeningTime] = useState(court?.openingTime ?? "08:00");
  const [closingTime, setClosingTime] = useState(court?.closingTime ?? "22:00");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const response = await fetch(
        court ? `/api/courts/${court.id}` : "/api/courts",
        {
          method: court ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            sport,
            description: description.trim() || null,
            pricePerHour,
            openingTime,
            closingTime,
          }),
        },
      );
      const result = (await response.json()) as CourtResponse;
      if (!response.ok) {
        setError(result.error?.message ?? "Não foi possível salvar a quadra.");
        return;
      }
      if (court) {
        onSaved?.(result.court);
        setSuccess("Quadra atualizada.");
      } else {
        router.push(`/courts/${result.court.id}`);
        router.refresh();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle =
    "mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400";
  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Nome da quadra *
          <input
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputStyle}
          />
        </label>
        <label className="block text-sm font-medium">
          Modalidade *
          <input
            required
            minLength={2}
            maxLength={60}
            value={sport}
            onChange={(event) => setSport(event.target.value)}
            placeholder="Futevôlei"
            className={inputStyle}
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Descrição
          <textarea
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputStyle}
          />
        </label>
        <label className="block text-sm font-medium">
          Preço padrão por hora (R$) *
          <input
            required
            type="number"
            min="0"
            max="99999.99"
            step="0.01"
            value={pricePerHour}
            onChange={(event) => setPricePerHour(event.target.value)}
            className={inputStyle}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Abertura *
            <input
              required
              type="time"
              value={openingTime}
              onChange={(event) => setOpeningTime(event.target.value)}
              className={inputStyle}
            />
          </label>
          <label className="block text-sm font-medium">
            Fechamento *
            <input
              required
              type="time"
              value={closingTime}
              onChange={(event) => setClosingTime(event.target.value)}
              className={inputStyle}
            />
          </label>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Horários regulares da quadra. Horários especiais serão configurados na
        agenda.
      </p>
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-lime-300">
          {success}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300 disabled:opacity-60"
        >
          {busy
            ? "Salvando..."
            : court
              ? "Salvar alterações"
              : "Cadastrar quadra"}
        </button>
        <Link
          href="/courts"
          className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
