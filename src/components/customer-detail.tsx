"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerEditor } from "@/components/customer-editor";
import type { Customer } from "@/features/customers/service";

export function CustomerDetail({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/customers/${id}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Cliente não encontrado."
              : "Não foi possível carregar o cliente.",
          );
        return (await response.json()) as { customer: Customer };
      })
      .then((result) => setCustomer(result.customer))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar o cliente.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  async function changeStatus() {
    if (!customer) return;
    if (
      customer.status === "active" &&
      !window.confirm("Inativar este cliente?")
    )
      return;
    setStatusBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: customer.status === "active" ? "DELETE" : "PATCH",
        headers:
          customer.status === "active"
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          customer.status === "active"
            ? undefined
            : JSON.stringify({ status: "active" }),
      });
      if (!response.ok) throw new Error("Não foi possível alterar o status.");
      if (customer.status === "active") {
        setCustomer({ ...customer, status: "inactive" });
      } else {
        const result = (await response.json()) as { customer: Customer };
        setCustomer(result.customer);
      }
    } catch {
      setError("Não foi possível alterar o status. Tente novamente.");
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading)
    return (
      <p role="status" className="text-sm text-slate-400">
        Carregando cliente...
      </p>
    );
  if (error && !customer)
    return (
      <p role="alert" className="text-sm text-rose-300">
        {error}
      </p>
    );
  if (!customer) return null;

  return (
    <section className="max-w-3xl">
      <Link href="/customers" className="text-sm text-lime-400 hover:underline">
        ← Voltar para clientes
      </Link>
      <div className="mt-5 mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Cliente desde{" "}
            {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <button
          type="button"
          disabled={statusBusy}
          onClick={changeStatus}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-60"
        >
          {statusBusy
            ? "Aguarde..."
            : customer.status === "active"
              ? "Inativar"
              : "Reativar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-5 text-sm text-rose-300">
          {error}
        </p>
      )}
      <CustomerEditor
        key={customer.id}
        customer={customer}
        onSaved={setCustomer}
      />
    </section>
  );
}
