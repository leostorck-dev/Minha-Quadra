import { Temporal } from "@js-temporal/polyfill";
import { csv } from "../../lib/export/csv.ts";
import type { Reservation } from "./service";

const statuses = {
  pending: "Pendente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Não compareceu",
};
const payments = {
  pending: "Pendente",
  paid: "Pago",
  refunded: "Estornado",
  cancelled: "Cancelado",
  free: "Sem cobrança",
};
export function agendaReport(items: Reservation[], timezone: string) {
  const local = (instant: string) =>
    Temporal.Instant.from(instant)
      .toZonedDateTimeISO(timezone)
      .toPlainDateTime()
      .toString({ smallestUnit: "second" });
  return csv([
    [
      "ID",
      "Quadra",
      "Cliente",
      "Tipo",
      "Início",
      "Fim",
      "Fuso",
      "Situação",
      "Valor (R$)",
      "Cobrança",
    ],
    ...items.map((item) => [
      item.id,
      item.courtName,
      item.customerName,
      item.kind === "booking" ? "Reserva" : "Bloqueio",
      local(item.startAt),
      local(item.endAt),
      timezone,
      statuses[item.status],
      item.price.toFixed(2).replace(".", ","),
      item.kind === "block"
        ? "Não se aplica"
        : item.paymentSituation
          ? payments[item.paymentSituation]
          : "Não informado",
    ]),
  ]);
}
