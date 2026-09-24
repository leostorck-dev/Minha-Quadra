"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useState, type FormEvent } from "react";
import type { FinancialTransaction } from "@/features/finance/service";
import {
  FINANCE_CATEGORIES,
  type FinanceStatus,
  type FinanceType,
} from "@/features/finance/validation";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const statuses: Record<FinanceStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
};
type FinanceResponse = {
  items: FinancialTransaction[];
  total: number;
  page: number;
  pageSize: number;
  summary: { income: number; expense: number; result: number; payable: number };
};

function NewTransactionForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (transaction: FinancialTransaction) => void;
}) {
  const [type, setType] = useState<FinanceType>("expense");
  const [category, setCategory] = useState<string>(
    FINANCE_CATEGORIES.expense[0],
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          description,
          amount,
          status,
          dueDate: dueDate || null,
        }),
      });
      const body = (await response.json()) as {
        error?: { message: string };
        transaction?: FinancialTransaction;
      };
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Não foi possível criar o lançamento.",
        );
      if (!body.transaction)
        throw new Error("Não foi possível confirmar o lançamento.");
      onSaved(body.transaction);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o lançamento.",
      );
    } finally {
      setBusy(false);
    }
  }

  const inputStyle =
    "mt-2 block w-full rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-white outline-none focus:border-lime-400";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Novo lançamento financeiro"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Novo lançamento</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Tipo
              <select
                value={type}
                onChange={(event) => {
                  const next = event.target.value as FinanceType;
                  setType(next);
                  setCategory(FINANCE_CATEGORIES[next][0]);
                }}
                className={inputStyle}
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Situação
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "pending" | "paid")
                }
                className={inputStyle}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputStyle}
            >
              {FINANCE_CATEGORIES[type].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Descrição
            <input
              required
              maxLength={240}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputStyle}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Valor (R$)
              <input
                required
                type="number"
                min="0.01"
                max="99999999.99"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className={inputStyle}
              />
            </label>
            <label className="text-sm font-medium">
              Vencimento
              <input
                type="date"
                required={type === "expense" && status === "pending"}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={inputStyle}
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Pago registra a movimentação de hoje. Pendente aparece no mês do
            vencimento.
          </p>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-lime-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Salvando..." : "Salvar lançamento"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function FinanceView({
  initialMonth,
  today,
}: {
  initialMonth: string;
  today: string;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [type, setType] = useState<FinanceType | "all">("all");
  const [status, setStatus] = useState<FinanceStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: FinanceResponse;
    error?: string;
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [actionError, setActionError] = useState("");

  const requestKey = JSON.stringify([month, type, status, page, reload]);
  const loading = result?.key !== requestKey;
  const data = loading ? null : result.data;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      month,
      type,
      status,
      page: String(page),
    });
    fetch(`/api/finance/transactions?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json()) as FinanceResponse & {
          error?: { message: string };
        };
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Não foi possível carregar o financeiro.",
          );
        return body;
      })
      .then((body) => setResult({ key: requestKey, data: body }))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setResult({
          key: requestKey,
          error:
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o financeiro.",
        });
      });
    return () => controller.abort();
  }, [month, type, status, page, reload, requestKey]);

  function moveMonth(delta: number) {
    setMonth(
      Temporal.PlainYearMonth.from(month).add({ months: delta }).toString(),
    );
    setPage(1);
  }

  async function changeStatus(
    item: FinancialTransaction,
    next: "paid" | "cancelled",
  ) {
    if (
      next === "cancelled" &&
      !window.confirm("Cancelar este lançamento pendente?")
    )
      return;
    setBusyId(item.id);
    setActionError("");
    try {
      const response = await fetch(`/api/finance/transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Não foi possível atualizar o lançamento.",
        );
      setReload((value) => value + 1);
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o lançamento.",
      );
    } finally {
      setBusyId("");
    }
  }

  const summaryCards = data
    ? [
        { label: "Receitas pagas", value: data.summary.income },
        { label: "Despesas pagas", value: data.summary.expense },
        { label: "Resultado", value: data.summary.result },
        { label: "Contas a pagar", value: data.summary.payable },
      ]
    : [];

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-lime-400">Gestão</p>
          <h1 className="mt-2 text-3xl font-bold">Financeiro</h1>
          <p className="mt-2 text-sm text-slate-400">
            Fluxo de caixa, receitas, despesas e contas a pagar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-lg bg-lime-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300"
        >
          Novo lançamento
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm"
        >
          Anterior
        </button>
        <label className="text-xs text-slate-400">
          Mês
          <input
            type="month"
            value={month}
            onChange={(event) => {
              if (event.target.value) {
                setMonth(event.target.value);
                setPage(1);
              }
            }}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm"
        >
          Próximo
        </button>
        <label className="text-xs text-slate-400">
          Tipo
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as FinanceType | "all");
              setPage(1);
            }}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Situação
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as FinanceStatus | "all");
              setPage(1);
            }}
            className="mt-1 block rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagas</option>
            <option value="cancelled">Canceladas</option>
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
          Carregando financeiro...
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
      ) : data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold">
                  {money.format(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">Lançamentos</h2>
              <span className="text-xs text-slate-400">
                {data.total} no filtro
              </span>
            </div>
            {data.items.length ? (
              <ul className="divide-y divide-white/10">
                {data.items.map((item) => {
                  const overdue =
                    item.type === "expense" &&
                    item.status === "pending" &&
                    item.dueDate !== null &&
                    item.dueDate < today;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.description}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.category} ·{" "}
                          {item.activityOn.split("-").reverse().join("/")}
                          {item.sourceType !== "manual" && " · Reserva"}
                        </p>
                        {overdue && (
                          <p className="mt-1 text-xs text-rose-300">
                            Conta vencida
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`font-semibold ${item.type === "income" ? "text-lime-300" : "text-rose-300"}`}
                        >
                          {item.type === "income" ? "+" : "−"}
                          {money.format(item.amount)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                          {statuses[item.status]}
                        </span>
                        {item.sourceType === "manual" &&
                          item.status === "pending" && (
                            <div className="flex gap-2 text-xs">
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => changeStatus(item, "paid")}
                                className="rounded-md border border-lime-400/40 px-2 py-1 text-lime-300 disabled:opacity-50"
                              >
                                Marcar como pago
                              </button>
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() => changeStatus(item, "cancelled")}
                                className="rounded-md border border-white/15 px-2 py-1 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-10 text-sm text-slate-400">
                Nenhum lançamento neste filtro.
              </p>
            )}
          </div>
          {data.total > data.pageSize && (
            <div className="mt-5 flex items-center justify-end gap-3 text-sm">
              <button
                type="button"
                disabled={page === 1}
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
        </>
      ) : null}

      {formOpen && (
        <NewTransactionForm
          onClose={() => setFormOpen(false)}
          onSaved={(transaction) => {
            setFormOpen(false);
            setMonth(transaction.activityOn.slice(0, 7));
            setPage(1);
            setReload((value) => value + 1);
          }}
        />
      )}
    </section>
  );
}
