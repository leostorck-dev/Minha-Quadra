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

export function financeCategoryReport(items: FinancialTransaction[]) {
  const groups = new Map<
    string,
    {
      type: FinancialTransaction["type"];
      category: string;
      status: FinancialTransaction["status"];
      count: number;
      cents: bigint;
    }
  >();
  for (const item of items) {
    const key = JSON.stringify([item.type, item.category, item.status]);
    const group = groups.get(key) ?? {
      type: item.type,
      category: item.category,
      status: item.status,
      count: 0,
      cents: BigInt(0),
    };
    group.count += 1;
    group.cents += BigInt(Math.round(item.amount * 100));
    groups.set(key, group);
  }
  const statuses = {
    paid: "Pago",
    pending: "Pendente",
    cancelled: "Cancelado",
  };
  return csv([
    ["Tipo", "Categoria", "Situação", "Quantidade", "Total (R$)"],
    ...Array.from(groups.values())
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          a.category.localeCompare(b.category, "pt-BR") ||
          a.status.localeCompare(b.status),
      )
      .map((group) => [
        group.type === "income" ? "Receita" : "Despesa",
        group.category,
        statuses[group.status],
        group.count,
        (group.cents / BigInt(100)).toString() +
          "," +
          (group.cents % BigInt(100)).toString().padStart(2, "0"),
      ]),
  ]);
}
