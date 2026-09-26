"use client";

import { useEffect, useState } from "react";
import type {
  MembershipOverview,
  MembershipPaymentsPage,
} from "@/features/memberships/service";
import type { MembershipMethod } from "@/features/memberships/validation";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const methods: Record<MembershipMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
};
const date = (value: string) => value.split("-").reverse().join("/");

export function MembershipPaymentHistory({
  overview,
  timezone,
  revision,
}: {
  overview: MembershipOverview;
  timezone: string;
  revision: number;
}) {
  const [page, setPage] = useState(1);
  const [membershipId, setMembershipId] = useState("");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: MembershipPaymentsPage;
    error?: string;
  } | null>(null);
  const key = JSON.stringify([page, membershipId, revision, retry]);
  const current = result?.key === key ? result : null;
  const customers = new Map(
    overview.customers.map((item) => [item.id, item.name]),
  );
  const plans = new Map(overview.plans.map((item) => [item.id, item.name]));
  const memberships = new Map(
    overview.memberships.map((item) => [item.id, item]),
  );
  const paidDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "short",
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      ...(membershipId ? { membershipId } : {}),
    });
    void fetch(`/api/memberships/payments?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Falha ao consultar pagamentos.",
          );
        if (!controller.signal.aborted) setResult({ key, data: body });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              cause instanceof Error
                ? cause.message
                : "Falha ao consultar pagamentos.",
          });
      });
    return () => controller.abort();
  }, [page, membershipId, key]);

  return (
    <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
      <h2 className="text-xl font-bold">Histórico de pagamentos</h2>
      <label className="mt-4 block text-sm">
        Filtrar por assinatura
        <select
          value={membershipId}
          onChange={(event) => {
            setMembershipId(event.target.value);
            setPage(1);
          }}
          className="mt-2 w-full rounded-lg border border-white/20 bg-slate-800 p-3"
        >
          <option value="">Todas as assinaturas</option>
          {overview.memberships.map((item) => (
            <option key={item.id} value={item.id}>
              {customers.get(item.customer_id) ?? "Cliente indisponível"} ·{" "}
              {plans.get(item.plan_id) ?? "Plano"} · início{" "}
              {date(item.start_on)} ·{" "}
              {item.status === "active" ? "Ativa" : "Cancelada"}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-slate-400">
        Recebimentos mais recentes primeiro. Horários no fuso da arena (
        {timezone}).
      </p>
      {!current && (
        <p role="status" className="mt-4 text-sm">
          Carregando pagamentos…
        </p>
      )}
      {current?.error && (
        <div role="alert" className="mt-4 text-sm text-rose-300">
          {current.error}{" "}
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="underline"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {current?.data && (
        <>
          <p className="mt-4 text-sm text-slate-400">
            {current.data.count} pagamentos encontrados
          </p>
          <ul className="mt-3">
            {current.data.items.map((payment) => {
              const membership = memberships.get(payment.membership_id);
              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">
                      {customers.get(membership?.customer_id ?? "") ??
                        "Cliente indisponível"}{" "}
                      · {plans.get(membership?.plan_id ?? "") ?? "Plano"}
                    </p>
                    <p className="mt-1 text-slate-400">
                      Vencimento quitado: {date(payment.period_due_on)} ·{" "}
                      {methods[payment.method as MembershipMethod] ??
                        payment.method}
                    </p>
                    <p className="text-slate-400">
                      Recebido em {paidDate.format(new Date(payment.paid_at))}
                    </p>
                  </div>
                  <strong>{money.format(payment.amount)}</strong>
                </li>
              );
            })}
            {!current.data.items.length && (
              <li className="text-sm text-slate-400">
                Nenhum pagamento encontrado.
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {page} de{" "}
              {Math.max(
                1,
                Math.ceil(current.data.count / current.data.pageSize),
              )}
            </span>
            <button
              type="button"
              disabled={page * current.data.pageSize >= current.data.count}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </section>
  );
}
