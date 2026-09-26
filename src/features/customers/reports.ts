import { csv } from "../../lib/export/csv.ts";
import type { CustomerListItem } from "./service";

export function customerReport(items: CustomerListItem[]) {
  return csv([
    [
      "Identificador",
      "Nome",
      "Telefone",
      "Email",
      "Nascimento",
      "Situação",
      "Etiquetas",
      "Reservas",
      "Última reserva (UTC)",
    ],
    ...items.map((item) => [
      item.id,
      item.name,
      item.phone,
      item.email,
      item.birthDate,
      item.status === "active" ? "Ativo" : "Inativo",
      item.tags.join(", "),
      item.reservationCount,
      item.lastReservationAt
        ? new Date(item.lastReservationAt).toISOString()
        : null,
    ]),
  ]);
}
