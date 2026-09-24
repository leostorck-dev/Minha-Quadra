"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Customer } from "@/features/customers/service";

type CustomerResponse = { customer: Customer; error?: { message: string } };

export function CustomerEditor({
  customer,
  onSaved,
}: {
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [birthDate, setBirthDate] = useState(customer?.birthDate ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [tags, setTags] = useState(customer?.tags.join(", ") ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!phone.trim() && !email.trim()) {
      setError("Informe telefone ou email.");
      return;
    }
    setBusy(true);

    try {
      const response = await fetch(
        customer ? `/api/customers/${customer.id}` : "/api/customers",
        {
          method: customer ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone: phone.trim() || null,
            email: email.trim() || null,
            birthDate: birthDate || null,
            notes: notes.trim() || null,
            tags: tags.trim()
              ? tags
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
          }),
        },
      );
      const result = (await response.json()) as CustomerResponse;
      if (!response.ok) {
        setError(result.error?.message ?? "Não foi possível salvar o cliente.");
        return;
      }

      if (customer) {
        onSaved?.(result.customer);
        setSuccess("Cliente atualizado.");
      } else {
        router.push(`/customers/${result.customer.id}`);
        router.refresh();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="space-y-5 rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Nome{" "}
          <span aria-hidden="true" className="text-lime-400">
            *
          </span>
          <input
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
        </label>
        <label className="block text-sm font-medium">
          Telefone
          <input
            type="tel"
            maxLength={20}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(11) 99999-9999"
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
        </label>
        <label className="block text-sm font-medium">
          Data de nascimento
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Observações
          <textarea
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Etiquetas
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="mensalista, iniciante, torneio"
            className="mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none focus:border-lime-400"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Separe por vírgulas. Até 10 etiquetas de 2 a 30 caracteres.
          </span>
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Informe pelo menos telefone ou email.
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
            : customer
              ? "Salvar alterações"
              : "Cadastrar cliente"}
        </button>
        <Link
          href="/customers"
          className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
