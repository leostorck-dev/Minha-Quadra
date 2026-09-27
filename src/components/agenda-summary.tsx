import type { Reservation } from "@/features/reservations/service";
import { summarizeAgenda } from "@/features/reservations/summary";

export function AgendaSummary({
  items,
  from,
  to,
  showPayments,
}: {
  items: Reservation[];
  from: string;
  to: string;
  showPayments: boolean;
}) {
  const summary = summarizeAgenda(items, from, to);
  const cards = [
    { label: "Reservas", value: String(summary.bookings) },
    { label: "Bloqueios", value: String(summary.blocks) },
    {
      label: "Horas agendadas",
      value:
        new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
          summary.minutes / 60,
        ) + " h",
    },
    ...(showPayments
      ? [
          {
            label: "Cobranças pendentes",
            value: new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(summary.pendingCents / 100),
          },
        ]
      : []),
  ];
  return (
    <section aria-label="Resumo do período" className="mt-6">
      <dl
        className={`grid gap-3 sm:grid-cols-2 ${showPayments ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-slate-900 p-4"
          >
            <dt className="text-sm text-slate-400">{card.label}</dt>
            <dd className="mt-2 text-2xl font-semibold">{card.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-400">
        Resumo dos filtros selecionados, sem cancelamentos e faltas. Horas
        somadas por quadra, incluindo reservas concluídas.
      </p>
      {showPayments && (
        <p className="mt-1 text-xs text-slate-400">
          Cobranças pendentes incluem somente reservas deste recorte ainda sem
          pagamento.
        </p>
      )}
    </section>
  );
}
