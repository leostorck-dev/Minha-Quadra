import { csv } from "../../lib/export/csv.ts";
import type { FinancialTransaction } from "./service";

export const FINANCE_SOURCES: Record<
  FinancialTransaction["sourceType"],
  string
> = {
  manual: "Manual",
  reservation: "Pagamento de reserva",
  refund: "Estorno de reserva",
  membership: "Mensalidade",
  class: "Pagamento de aula",
  class_refund: "Estorno de aula",
  coach_commission: "Comissão de professor",
};

export function financeReport(items: FinancialTransaction[]) {
  const statuses = {
    paid: "Pago",
    pending: "Pendente",
    cancelled: "Cancelado",
  };
  return csv([
    [
      "Identificador",
      "Data de referência",
      "Tipo",
      "Categoria",
      "Descrição",
      "Valor (R$)",
      "Situação",
      "Vencimento",
      "Pagamento (UTC)",
      "Origem",
    ],
    ...items.map((item) => [
      item.id,
      item.activityOn,
      item.type === "income" ? "Receita" : "Despesa",
      item.category,
      item.description,
      item.amount.toFixed(2).replace(".", ","),
      statuses[item.status],
      item.dueDate,
      item.paidAt ? new Date(item.paidAt).toISOString() : null,
      FINANCE_SOURCES[item.sourceType] ?? item.sourceType,
    ]),
  ]);
}
