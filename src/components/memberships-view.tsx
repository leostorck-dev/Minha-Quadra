"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  MembershipOverview,
  Membership,
  Plan,
} from "@/features/memberships/service";
import type { MembershipMethod } from "@/features/memberships/validation";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
const methods: Record<MembershipMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
};

async function api(path: string, method = "GET", payload?: unknown) {
  const response = await fetch(path, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Não foi possível concluir a operação.",
    );
  return body;
}

export function MembershipsView({ today }: { today: string }) {
  const [data, setData] = useState<MembershipOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [classes, setClasses] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startOn, setStartOn] = useState(today);
  const [method, setMethod] = useState<MembershipMethod>("pix");

  async function load() {
    setData(await api("/api/memberships"));
  }
  useEffect(() => {
    void api("/api/memberships")
      .then((result) => setData(result))
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Falha ao carregar."),
      );
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setNotice(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na operação.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await run(
      () =>
        api("/api/memberships/plans", "POST", {
          name,
          monthlyPrice: price,
          classesPerMonth: classes ? Number(classes) : null,
        }),
      "Plano criado.",
    );
    if (saved) {
      setName("");
      setPrice("");
      setClasses("");
    }
  }

  async function addMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await run(
      () => api("/api/memberships", "POST", { customerId, planId, startOn }),
      "Assinatura criada.",
    );
    if (saved) setCustomerId("");
  }

  const active = useMemo(
    () => data?.memberships.filter((item) => item.status === "active") ?? [],
    [data],
  );
  const due = active.filter((item) => item.next_due_on <= today);
  const byCustomer = new Map(
    data?.customers.map((item) => [item.id, item.name]),
  );
  const byPlan = new Map(data?.plans.map((item) => [item.id, item.name]));
  const byMembership = new Map(
    data?.memberships.map((item) => [item.id, item]),
  );
  const eligible =
    data?.customers.filter(
      (item) =>
        !active.some((membership) => membership.customer_id === item.id),
    ) ?? [];

  function planRow(plan: Plan) {
    return (
      <li
        key={plan.id}
        className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4"
      >
        <div>
          <p className="font-semibold">
            {plan.name}{" "}
            <span className={plan.active ? "text-lime-400" : "text-slate-400"}>
              · {plan.active ? "Ativo" : "Inativo"}
            </span>
          </p>
          <p className="text-sm text-slate-400">
            {money.format(plan.monthly_price)}/mês ·{" "}
            {plan.classes_per_month === null
              ? "Aulas ilimitadas"
              : `${plan.classes_per_month} aulas/mês`}
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() =>
            void run(
              () =>
                api(`/api/memberships/plans/${plan.id}`, "PATCH", {
                  active: !plan.active,
                }),
              "Plano atualizado.",
            )
          }
          className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          {plan.active ? "Desativar" : "Reativar"}
        </button>
      </li>
    );
  }

  function membershipRow(item: Membership) {
    const isDue = item.next_due_on <= today;
    const usage = data?.usage.find((row) => row.membershipId === item.id);
    const overLimit =
      usage && item.classes_per_month !== null
        ? Math.max(usage.attendedClasses - item.classes_per_month, 0)
        : 0;
    return (
      <li key={item.id} className="border-t border-white/10 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">
              {byCustomer.get(item.customer_id) ?? "Cliente inativo"} ·{" "}
              {byPlan.get(item.plan_id) ?? "Plano"}
            </p>
            <p className="text-sm text-slate-400">
              {money.format(item.monthly_price)}/mês · Vencimento:{" "}
              {date(item.next_due_on)}
            </p>
            <p className="text-sm text-slate-400">
              {usage
                ? item.classes_per_month === null
                  ? `${usage.attendedClasses} aulas usadas neste período · Ilimitado`
                  : `${usage.attendedClasses} de ${item.classes_per_month} aulas usadas · ${usage.remainingClasses} restantes`
                : item.classes_per_month === null
                  ? "Aulas ilimitadas"
                  : `${item.classes_per_month} aulas/mês`}
            </p>
            {usage && (
              <p className="text-xs text-slate-500">
                Período iniciado em {date(usage.cycleStart)}
              </p>
            )}
            {usage &&
              item.classes_per_month !== null &&
              usage.remainingClasses === 0 && (
                <p className="mt-1 text-sm font-semibold text-amber-300">
                  {overLimit > 0
                    ? `${overLimit} aula${overLimit === 1 ? "" : "s"} acima da franquia`
                    : "Franquia de aulas atingida"}
                </p>
              )}
            {isDue && (
              <p className="mt-1 text-sm font-semibold text-amber-300">
                {item.next_due_on < today ? "Em atraso" : "Vence hoje"}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isDue && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(
                    () =>
                      api(`/api/memberships/${item.id}/payments`, "POST", {
                        method,
                      }),
                    "Mensalidade paga e registrada no financeiro.",
                  )
                }
                className="rounded-lg bg-lime-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                Registrar pagamento
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Cancelar esta assinatura? O histórico será mantido.",
                  )
                )
                  void run(
                    () =>
                      api(`/api/memberships/${item.id}`, "PATCH", {
                        status: "cancelled",
                      }),
                    "Assinatura cancelada.",
                  );
              }}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase">
          Gestão de receita recorrente
        </p>
        <h1 className="mt-2 text-3xl font-bold">Planos e mensalidades</h1>
        <p className="mt-2 text-slate-400">
          Crie planos, associe clientes e registre pagamentos mensais.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-lime-400/30 bg-lime-400/10 p-3 text-sm text-lime-300"
        >
          {notice}
        </p>
      )}
      {!data ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Planos ativos", data.plans.filter((p) => p.active).length],
              ["Assinaturas ativas", active.length],
              ["Mensalidades a receber", due.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Criar plano</h2>
              <form onSubmit={addPlan} className="mt-4 grid gap-3">
                <input
                  required
                  maxLength={80}
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do plano"
                  aria-label="Nome do plano"
                  className="rounded-lg border border-white/20 bg-slate-800 p-3"
                />
                <input
                  required
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Preço mensal (R$)"
                  aria-label="Preço mensal em reais"
                  className="rounded-lg border border-white/20 bg-slate-800 p-3"
                />
                <input
                  min="1"
                  max="1000"
                  step="1"
                  type="number"
                  value={classes}
                  onChange={(e) => setClasses(e.target.value)}
                  placeholder="Aulas por mês (vazio = ilimitado)"
                  aria-label="Aulas por mês, deixe vazio para ilimitado"
                  className="rounded-lg border border-white/20 bg-slate-800 p-3"
                />
                <button
                  disabled={busy}
                  className="rounded-lg bg-lime-400 p-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Criar plano
                </button>
              </form>
              <ul className="mt-5">
                {data.plans.length ? (
                  data.plans.map(planRow)
                ) : (
                  <li className="text-sm text-slate-400">
                    Nenhum plano cadastrado.
                  </li>
                )}
              </ul>
            </section>
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Adicionar cliente ao plano</h2>
              <form onSubmit={addMembership} className="mt-4 grid gap-3">
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  aria-label="Cliente"
                  className="rounded-lg border border-white/20 bg-slate-800 p-3"
                >
                  <option value="">Selecione o cliente</option>
                  {eligible.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  aria-label="Plano"
                  className="rounded-lg border border-white/20 bg-slate-800 p-3"
                >
                  <option value="">Selecione o plano</option>
                  {data.plans
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {money.format(item.monthly_price)}
                      </option>
                    ))}
                </select>
                <label className="text-sm text-slate-300">
                  Início e dia do vencimento (1 a 28)
                  <input
                    required
                    type="date"
                    value={startOn}
                    onChange={(e) => setStartOn(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                </label>
                <button
                  disabled={
                    busy ||
                    !eligible.length ||
                    !data.plans.some((item) => item.active)
                  }
                  className="rounded-lg bg-lime-400 p-3 font-semibold text-slate-950 disabled:opacity-50"
                >
                  Criar assinatura
                </button>
              </form>
            </section>
          </div>
          <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Assinaturas ativas</h2>
              <label className="text-sm text-slate-300">
                Pagamento por{" "}
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as MembershipMethod)
                  }
                  className="ml-2 rounded-lg border border-white/20 bg-slate-800 p-2"
                >
                  {Object.entries(methods).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <ul className="mt-4">
              {active.length ? (
                active.map(membershipRow)
              ) : (
                <li className="text-sm text-slate-400">
                  Nenhuma assinatura ativa.
                </li>
              )}
            </ul>
          </section>
          <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-xl font-bold">Pagamentos recentes</h2>
            <ul className="mt-4">
              {data.payments.length ? (
                data.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap justify-between gap-2 border-t border-white/10 py-3 text-sm"
                  >
                    <span>
                      {byCustomer.get(
                        byMembership.get(payment.membership_id)?.customer_id ??
                          "",
                      ) ?? "Cliente inativo"}{" "}
                      · {date(payment.period_due_on)} ·{" "}
                      {methods[payment.method as MembershipMethod]}
                    </span>
                    <strong>{money.format(payment.amount)}</strong>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-400">
                  Nenhum pagamento registrado.
                </li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
