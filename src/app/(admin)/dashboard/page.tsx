import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardOverview } from "@/features/dashboard/service";
import { getAuthContext } from "@/lib/auth/context";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const number = new Intl.NumberFormat("pt-BR");
const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function Metric({
  title,
  value,
  note,
  href,
}: {
  title: string;
  value: string;
  note: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-lime-400/40"
    >
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const dashboard = await getDashboardOverview(context);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dashboard.today.slice(0, 7)}-01T12:00:00Z`));
  const dateFormat = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: dashboard.timezone,
  });
  const financial = dashboard.financial;
  const chartMax = Math.max(
    1,
    ...(financial?.revenueSeries.map((item) => item.income) ?? []),
  );

  return (
    <section>
      <p className="text-sm text-lime-400">Visão geral</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Olá, {context.name}</h1>
        <span className="text-sm text-slate-400">{monthLabel}</span>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Acompanhe a operação e os resultados da sua arena.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          title="Reservas de hoje"
          value={number.format(dashboard.bookingsToday)}
          note="Reservas válidas na agenda"
          href="/agenda"
        />
        {context.role !== "COACH" && (
          <Metric
            title="Clientes ativos"
            value={number.format(dashboard.activeCustomers)}
            note="Cadastros ativos da arena"
            href="/customers"
          />
        )}
        <Metric
          title="Ocupação prevista"
          value={`${number.format(dashboard.occupancyPercent)}%`}
          note="Reservas do mês / horas disponíveis"
          href="/agenda"
        />
      </div>

      {financial && (
        <>
          <h2 className="mt-10 text-xl font-semibold">Resultados</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              title="Receita de hoje"
              value={currency.format(financial.todayIncome)}
              note="Receitas pagas no dia"
              href="/finance"
            />
            <Metric
              title="Receita do mês"
              value={currency.format(financial.monthIncome)}
              note="Receitas pagas no mês"
              href="/finance"
            />
            <Metric
              title="Ticket médio"
              value={currency.format(financial.averageTicket)}
              note="Pagamentos de reservas não estornados"
              href="/finance"
            />
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Receita dos últimos 6 meses
              </h2>
              <p className="text-xs text-slate-400">Receitas pagas por mês</p>
            </div>
            <div className="mt-7 grid grid-cols-6 items-end gap-2 sm:gap-5">
              {financial.revenueSeries.map((item) => {
                const height = Math.max(3, (item.income / chartMax) * 100);
                const label = new Intl.DateTimeFormat("pt-BR", {
                  month: "short",
                  timeZone: "UTC",
                }).format(new Date(`${item.month}-01T12:00:00Z`));
                return (
                  <div key={item.month} className="min-w-0 text-center">
                    <p
                      className="truncate text-xs text-slate-300"
                      title={currency.format(item.income)}
                    >
                      {compactCurrency.format(item.income)}
                    </p>
                    <div className="mt-3 flex h-36 items-end rounded-t-lg bg-white/5">
                      <div
                        role="img"
                        aria-label={`${label}: ${currency.format(item.income)}`}
                        className="w-full rounded-t-lg bg-lime-400"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-400 capitalize">
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold">Próximas reservas</h2>
          <Link
            href="/agenda"
            className="text-sm font-medium text-lime-400 hover:underline"
          >
            Ver agenda →
          </Link>
        </div>
        {dashboard.upcoming.length ? (
          <ul className="divide-y divide-white/10">
            {dashboard.upcoming.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{item.courtName}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.customerName}
                  </p>
                </div>
                <time
                  dateTime={item.startAt}
                  className="text-sm text-slate-300"
                >
                  {dateFormat.format(new Date(item.startAt))}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-sm text-slate-400">
            Nenhuma reserva futura. Abra a agenda para criar uma.
          </p>
        )}
      </div>
    </section>
  );
}
