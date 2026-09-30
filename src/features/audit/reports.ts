import { csv } from "../../lib/export/csv.ts";
import type { AuditExportLog } from "./service";

export function auditReport(items: AuditExportLog[]) {
  return csv([
    [
      "ID do evento",
      "Data e hora (UTC)",
      "Evento (código)",
      "Tipo da entidade",
      "ID da entidade",
      "Usuário",
      "ID do usuário",
    ],
    ...items.map((item) => [
      item.id,
      new Date(item.createdAt).toISOString(),
      item.event,
      item.entityType,
      item.entityId,
      item.actorName,
      item.actorId,
    ]),
  ]);
}
