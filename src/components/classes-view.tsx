"use client";

import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Role } from "@/lib/auth/context";
import type {
  ClassOverview,
  ClassSession,
  Coach,
} from "@/features/classes/service";
import type { ClassKind, CommissionType } from "@/features/classes/validation";
import { ClassPaymentPanel } from "@/components/class-payment-panel";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const kinds: Record<ClassKind, string> = {
  individual: "Individual",
  duo: "Dupla",
  group: "Grupo",
  trial: "Experimental",
};

async function api(path: string, method = "GET", payload?: unknown) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "Não foi possível concluir a operação.",
    );
  return body;
}

function ClassCard({
  item,
  data,
  timezone,
  role,
  busy,
  nowEpoch,
  onAction,
}: {
  item: ClassSession;
  data: ClassOverview;
  timezone: string;
  role: Role;
  busy: boolean;
  nowEpoch: number;
  onAction: (
    action: () => Promise<unknown>,
    message: string,
  ) => Promise<boolean>;
}) {
  const reservation = data.reservations.find(
    (row) => row.id === item.reservation_id,
  );
  const coach = data.coaches.find((row) => row.id === item.coach_id);
  const court = data.courts.find((row) => row.id === item.court_id);
  const students = data.students.filter((row) => row.class_id === item.id);
  const payment = data.payments.find((row) => row.class_id === item.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [present, setPresent] = useState<string[]>(
    students.map((row) => row.customer_id),
  );
  const date = reservation
    ? new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(reservation.start_at))
    : "Horário indisponível";
  const canFinish =
    item.status === "scheduled" &&
    !!reservation &&
    Date.parse(reservation.start_at) <= nowEpoch;
  const commission =
    item.commission_type === "percentage"
      ? (item.price * item.commission_value) / 100
      : item.commission_value;
  return (
    <li className="rounded-xl border border-white/10 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {kinds[item.kind as ClassKind]} · {date}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {coach?.name ?? "Professor"} · {court?.name ?? "Quadra"} ·{" "}
            {money.format(item.price)}
          </p>
          <p className="text-sm text-slate-400">
            Comissão estimada: {money.format(commission)}
          </p>
          {role !== "COACH" && (
            <p className="mt-1 text-sm text-slate-300">
              Cobrança avulsa:{" "}
              {payment
                ? payment.status === "paid"
                  ? "Paga"
                  : "Estornada"
                : item.status === "cancelled"
                  ? "Cancelada"
                  : item.price === 0
                    ? "Sem cobrança"
                    : "Pendente"}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "completed" ? "bg-lime-400/15 text-lime-300" : item.status === "cancelled" ? "bg-slate-700 text-slate-300" : "bg-amber-400/15 text-amber-300"}`}
        >
          {item.status === "completed"
            ? "Concluída"
            : item.status === "cancelled"
              ? "Cancelada"
              : "Agendada"}
        </span>
      </div>
      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="mb-2 text-sm font-semibold">Alunos e presença</p>
        <div className="flex flex-wrap gap-2">
          {students.map((student) => (
            <label
              key={student.customer_id}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm"
            >
              {item.status === "scheduled" && canFinish && (
                <input
                  type="checkbox"
                  checked={present.includes(student.customer_id)}
                  onChange={(event) =>
                    setPresent((current) =>
                      event.target.checked
                        ? [...current, student.customer_id]
                        : current.filter((id) => id !== student.customer_id),
                    )
                  }
                />
              )}
              {data.customers.find((row) => row.id === student.customer_id)
                ?.name ?? "Aluno"}
              {item.status === "completed" && (
                <span
                  className={
                    student.attendance === "present"
                      ? "text-lime-300"
                      : "text-slate-400"
                  }
                >
                  · {student.attendance === "present" ? "Presente" : "Ausente"}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
      {item.status === "scheduled" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canFinish && (
            <button
              disabled={busy}
              onClick={() =>
                void onAction(
                  () =>
                    api(`/api/classes/${item.id}`, "PATCH", {
                      status: "completed",
                      presentCustomerIds: present,
                    }),
                  "Aula concluída e presença registrada.",
                )
              }
              className="rounded-lg bg-lime-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              Concluir aula
            </button>
          )}
          {role !== "COACH" && (
            <button
              disabled={busy || payment?.status === "paid"}
              onClick={() => {
                if (
                  window.confirm(
                    "Cancelar esta aula e liberar o horário da quadra?",
                  )
                )
                  void onAction(
                    () =>
                      api(`/api/classes/${item.id}`, "PATCH", {
                        status: "cancelled",
                      }),
                    "Aula cancelada e horário liberado.",
                  );
              }}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
            >
              Cancelar aula
            </button>
          )}
          {payment?.status === "paid" && role !== "COACH" && (
            <p className="self-center text-xs text-amber-300">
              Estorne o pagamento antes de cancelar.
            </p>
          )}
        </div>
      )}
      {role !== "COACH" &&
        item.price > 0 &&
        (item.status !== "cancelled" || payment) && (
          <button
            type="button"
            onClick={() => setPaymentOpen(true)}
            className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-sm"
          >
            {payment ? "Ver pagamento" : "Registrar cobrança avulsa"}
          </button>
        )}
      {paymentOpen && (
        <ClassPaymentPanel
          classSession={item}
          onClose={() => setPaymentOpen(false)}
          onChanged={() =>
            onAction(async () => undefined, "Pagamento da aula atualizado.")
          }
        />
      )}
    </li>
  );
}

export function ClassesView({
  timezone,
  role,
  today,
  initialNow,
}: {
  timezone: string;
  role: Role;
  today: string;
  initialNow: number;
}) {
  const [nowEpoch, setNowEpoch] = useState(initialNow);
  const [data, setData] = useState<ClassOverview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [commissionType, setCommissionType] =
    useState<CommissionType>("percentage");
  const [commissionValue, setCommissionValue] = useState("0");
  const [profileId, setProfileId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [courtId, setCourtId] = useState("");
  const [kind, setKind] = useState<ClassKind>("individual");
  const [startLocal, setStartLocal] = useState(`${today}T10:00`);
  const [endLocal, setEndLocal] = useState(`${today}T11:00`);
  const [price, setPrice] = useState("0");
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [coachFilter, setCoachFilter] = useState("");

  useEffect(() => {
    void api("/api/classes")
      .then(setData)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Falha ao carregar aulas.",
        ),
      );
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNowEpoch(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setData(await api("/api/classes"));
      setNotice(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na operação.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await run(
      () =>
        api("/api/classes/coaches", "POST", {
          name,
          phone: phone || null,
          email: email || null,
          specialties: specialties
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          commissionType,
          commissionValue,
          profileId: profileId || null,
        }),
      "Professor cadastrado.",
    );
    if (saved) {
      setName("");
      setPhone("");
      setEmail("");
      setSpecialties("");
      setProfileId("");
    }
  }

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let startAt: string, endAt: string;
    try {
      startAt = Temporal.PlainDateTime.from(startLocal)
        .toZonedDateTime(timezone)
        .toInstant()
        .toString();
      endAt = Temporal.PlainDateTime.from(endLocal)
        .toZonedDateTime(timezone)
        .toInstant()
        .toString();
    } catch {
      setError("Data ou horário inválido.");
      return;
    }
    const saved = await run(
      () =>
        api("/api/classes", "POST", {
          coachId,
          courtId,
          kind,
          startAt,
          endAt,
          price,
          customerIds,
        }),
      "Aula agendada; a quadra foi bloqueada.",
    );
    if (saved) setCustomerIds([]);
  }

  const sorted = useMemo(
    () =>
      data?.classes.slice().sort((a, b) => {
        const ar =
          data.reservations.find((row) => row.id === a.reservation_id)
            ?.start_at ?? "";
        const br =
          data.reservations.find((row) => row.id === b.reservation_id)
            ?.start_at ?? "";
        return br.localeCompare(ar);
      }) ?? [],
    [data],
  );
  const shown = coachFilter
    ? sorted.filter((item) => item.coach_id === coachFilter)
    : sorted;
  const completed = sorted.filter((item) => item.status === "completed");
  const revenue = completed.reduce((sum, item) => sum + item.price, 0);
  const commissions = completed.reduce(
    (sum, item) =>
      sum +
      (item.commission_type === "percentage"
        ? (item.price * item.commission_value) / 100
        : item.commission_value),
    0,
  );
  const activeCoaches =
    data?.coaches.filter((item) => item.status === "active") ?? [];
  const activeCustomers =
    data?.customers.filter((item) => item.status === "active") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold tracking-[0.2em] text-lime-400 uppercase">
          Operação da arena
        </p>
        <h1 className="mt-2 text-3xl font-bold">Professores e aulas</h1>
        <p className="mt-2 text-slate-400">
          Gerencie horários, alunos, presença e comissão.
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
              [
                "Aulas agendadas",
                sorted.filter((item) => item.status === "scheduled").length,
              ],
              ["Valor das aulas concluídas", money.format(revenue)],
              ["Comissões estimadas", money.format(commissions)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          {role !== "COACH" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-bold">Cadastrar professor</h2>
                <form onSubmit={addCoach} className="mt-4 grid gap-3">
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome"
                    aria-label="Nome do professor"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefone"
                    aria-label="Telefone do professor"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    aria-label="Email do professor"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                  <input
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="Especialidades separadas por vírgula"
                    aria-label="Especialidades"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                  {role === "OWNER" && (
                    <select
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                      aria-label="Conta de acesso do professor"
                      className="rounded-lg border border-white/20 bg-slate-800 p-3"
                    >
                      <option value="">Sem conta de acesso vinculada</option>
                      {data.profiles
                        .filter(
                          (profile) =>
                            !data.coaches.some(
                              (coach) => coach.profile_id === profile.id,
                            ),
                        )
                        .map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <div className="flex gap-3">
                    <select
                      value={commissionType}
                      onChange={(e) =>
                        setCommissionType(e.target.value as CommissionType)
                      }
                      aria-label="Tipo de comissão"
                      className="min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-800 p-3"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor por aula (R$)</option>
                    </select>
                    <input
                      required
                      type="number"
                      min="0"
                      max={
                        commissionType === "percentage" ? "100" : "99999999.99"
                      }
                      step="0.01"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      aria-label="Valor da comissão"
                      className="w-32 rounded-lg border border-white/20 bg-slate-800 p-3"
                    />
                  </div>
                  <button
                    disabled={busy}
                    className="rounded-lg bg-lime-400 p-3 font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Cadastrar professor
                  </button>
                </form>
              </section>
              <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
                <h2 className="text-xl font-bold">Agendar aula</h2>
                <form onSubmit={addClass} className="mt-4 grid gap-3">
                  <select
                    required
                    value={coachId}
                    onChange={(e) => setCoachId(e.target.value)}
                    aria-label="Professor da aula"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  >
                    <option value="">Professor</option>
                    {activeCoaches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    required
                    value={courtId}
                    onChange={(e) => setCourtId(e.target.value)}
                    aria-label="Quadra da aula"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  >
                    <option value="">Quadra</option>
                    {data.courts
                      .filter((item) => item.status === "available")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <select
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value as ClassKind);
                      setCustomerIds([]);
                    }}
                    aria-label="Tipo de aula"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  >
                    {Object.entries(kinds).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-slate-300">
                      Início
                      <input
                        required
                        type="datetime-local"
                        step="1800"
                        value={startLocal}
                        onChange={(e) => setStartLocal(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                      />
                    </label>
                    <label className="text-sm text-slate-300">
                      Fim
                      <input
                        required
                        type="datetime-local"
                        step="1800"
                        value={endLocal}
                        onChange={(e) => setEndLocal(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-white/20 bg-slate-800 p-3"
                      />
                    </label>
                  </div>
                  <input
                    required
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    aria-label="Valor da aula em reais"
                    placeholder="Valor da aula (R$)"
                    className="rounded-lg border border-white/20 bg-slate-800 p-3"
                  />
                  <fieldset className="max-h-48 overflow-y-auto rounded-lg border border-white/20 p-3">
                    <legend className="px-1 text-sm text-slate-300">
                      Alunos ({customerIds.length})
                    </legend>
                    {activeCustomers.length ? (
                      activeCustomers.map((customer) => (
                        <label
                          key={customer.id}
                          className="flex items-center gap-2 py-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={customerIds.includes(customer.id)}
                            onChange={(e) =>
                              setCustomerIds((current) =>
                                e.target.checked
                                  ? [...current, customer.id]
                                  : current.filter((id) => id !== customer.id),
                              )
                            }
                          />
                          {customer.name}
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">
                        Cadastre clientes para agendar aulas.
                      </p>
                    )}
                  </fieldset>
                  <p className="text-xs text-slate-400">
                    Individual e experimental: 1 aluno. Dupla: 2. Grupo: 3 a 12.
                  </p>
                  <button
                    disabled={
                      busy || !activeCoaches.length || !activeCustomers.length
                    }
                    className="rounded-lg bg-lime-400 p-3 font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Agendar aula
                  </button>
                </form>
              </section>
            </div>
          )}
          {role !== "COACH" && (
            <section className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <h2 className="text-xl font-bold">Professores</h2>
              <ul className="mt-4">
                {data.coaches.length ? (
                  data.coaches.map((coach: Coach) => (
                    <li
                      key={coach.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {coach.name} ·{" "}
                          {coach.status === "active" ? "Ativo" : "Inativo"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {coach.specialties.join(", ") || "Sem especialidades"}{" "}
                          · Comissão:{" "}
                          {coach.commission_type === "percentage"
                            ? `${coach.commission_value}%`
                            : money.format(coach.commission_value)}
                        </p>
                      </div>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              api(`/api/classes/coaches/${coach.id}`, "PATCH", {
                                status:
                                  coach.status === "active"
                                    ? "inactive"
                                    : "active",
                              }),
                            "Professor atualizado.",
                          )
                        }
                        className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {coach.status === "active" ? "Desativar" : "Reativar"}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-400">
                    Nenhum professor cadastrado.
                  </li>
                )}
              </ul>
            </section>
          )}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Agenda e histórico de aulas</h2>
              {role !== "COACH" && (
                <select
                  value={coachFilter}
                  onChange={(e) => setCoachFilter(e.target.value)}
                  aria-label="Filtrar por professor"
                  className="rounded-lg border border-white/20 bg-slate-800 p-2"
                >
                  <option value="">Todos os professores</option>
                  {data.coaches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <ul className="grid gap-4">
              {shown.length ? (
                shown.map((item) => (
                  <ClassCard
                    key={item.id}
                    item={item}
                    data={data}
                    timezone={timezone}
                    role={role}
                    busy={busy}
                    nowEpoch={nowEpoch}
                    onAction={run}
                  />
                ))
              ) : (
                <li className="text-slate-400">Nenhuma aula encontrada.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
