import Link from "next/link";
import { redirect } from "next/navigation";
import { listAuditLogs, type AuditLog } from "@/features/audit/service";
import { parseAuditFilters, type AuditType } from "@/features/audit/validation";
import { getArenaTimezone } from "@/features/reservations/service";
import { getAuthContext } from "@/lib/auth/context";

const eventLabels: Record<string, string> = {
  "customer.created": "Cliente cadastrado",
  "customer.updated": "Cliente atualizado",
  "customer.deactivated": "Cliente inativado",
  "reservation.created": "Reserva criada",
  "reservation.updated": "Reserva alterada",
  "reservation.cancelled": "Reserva cancelada",
  "reservation.checked_in": "Check-in realizado",
  "reservation.completed": "Reserva concluída",
  "reservation.no_show": "Ausência registrada",
  "payment.created": "Pagamento registrado",
  "payment.refunded": "Pagamento estornado",
};
const filters: { value: AuditType; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "customer", label: "Clientes" },
  { value: "reservation", label: "Reservas" },
  { value: "payment", label: "Pagamentos" },
];
const fieldLabels: Record<string, string> = {
  name: "nome",
  phone: "telefone",
  email: "email",
  birthDate: "nascimento",
  notes: "observações",
  status: "situação",
  court: "quadra",
  customer: "cliente",
  startAt: "início",
  endAt: "fim",
  price: "preço",
};
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function eventTitle(item: AuditLog) {
  if (
    item.event === "reservation.created" &&
    item.details &&
    typeof item.details === "object" &&
    !Array.isArray(item.details) &&
    item.details.kind === "block"
  ) {
    return "Bloqueio criado";
  }
  return eventLabels[item.event] ?? item.event;
}

function eventDetails(item: AuditLog) {
  if (
    !item.details ||
    typeof item.details !== "object" ||
    Array.isArray(item.details)
  )
    return null;
  const details = item.details;
  if (item.entityType === "payment") {
    const amount = details.amount;
    const method = details.method;
    if (typeof amount === "number" && typeof method === "string") {
      return `${currency.format(amount)} · ${method}`;
    }
  }
  const changedFields = details.changedFields;
  if (Array.isArray(changedFields)) {
    const labels = changedFields
      .filter((value): value is string => typeof value === "string")
      .map((value) => fieldLabels[value] ?? value);
    if (labels.length) return `Campos: ${labels.join(", ")}`;
  }
  return null;
}

function auditHref(type: AuditType, page: number) {
  return `/audit?type=${type}&page=${page}`;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "OWNER" && context.role !== "MANAGER")
    redirect("/dashboard");
  const values = await searchParams;
  const params = new URLSearchParams();
  if (typeof values.type === "string") params.set("type", values.type);
  if (typeof values.page === "string") params.set("page", values.page);
  let selected;
  try {
    selected = parseAuditFilters(params);
  } catch {
    redirect("/audit");
  }
  const [audit, timezone] = await Promise.all([
    listAuditLogs(context, selected),
    getArenaTimezone(context),
  ]);
  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: timezone,
  });

  return (
    <section>
      <p className="text-sm text-lime-400">Gestão</p>
      <h1 className="mt-2 text-3xl font-bold">Auditoria</h1>
      <p className="mt-3 text-sm text-slate-400">
        Histórico de mudanças em clientes, reservas e pagamentos.
      </p>
      <div className="mt-7 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={auditHref(filter.value, 1)}
            aria-current={selected.type === filter.value ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${selected.type === filter.value ? "bg-lime-400 text-slate-950" : "border border-white/15 text-slate-300 hover:bg-white/10"}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <div className="flex justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">Eventos</h2>
          <span className="text-xs text-slate-400">
            {audit.total} no filtro
          </span>
        </div>
        {audit.items.length ? (
          <ul className="divide-y divide-white/10">
            {audit.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{eventTitle(item)}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {item.actorName}
                    {eventDetails(item) && ` · ${eventDetails(item)}`}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    Registro {item.entityId}
                  </p>
                </div>
                <time
                  dateTime={item.createdAt}
                  className="text-xs text-slate-400"
                >
                  {dateFormat.format(new Date(item.createdAt))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-10 text-sm text-slate-400">
            Nenhum evento registrado neste filtro. O histórico começa nesta
            etapa.
          </p>
        )}
      </div>
      {audit.total > audit.pageSize && (
        <div className="mt-5 flex items-center justify-end gap-3 text-sm">
          {selected.page > 1 && (
            <Link
              href={auditHref(selected.type, selected.page - 1)}
              className="rounded-lg border border-white/15 px-3 py-2"
            >
              Anterior
            </Link>
          )}
          <span>
            Página {selected.page} de {Math.ceil(audit.total / audit.pageSize)}
          </span>
          {selected.page * audit.pageSize < audit.total && (
            <Link
              href={auditHref(selected.type, selected.page + 1)}
              className="rounded-lg border border-white/15 px-3 py-2"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
