import { csv } from "../../lib/export/csv.ts";
import type { MembershipPaymentReportItem } from "./service";
const methods: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
};
export function membershipPaymentReport(items: MembershipPaymentReportItem[]) {
  return csv([
    [
      "Pagamento",
      "Assinatura",
      "Cliente",
      "Plano",
      "Vencimento quitado",
      "Valor (R$)",
      "Meio",
      "Recebimento (UTC)",
    ],
    ...items.map((item) => [
      item.id,
      item.membership_id,
      item.customerName,
      item.planName,
      item.period_due_on,
      item.amount.toFixed(2).replace(".", ","),
      methods[item.method] ?? item.method,
      new Date(item.paid_at).toISOString(),
    ]),
  ]);
}
