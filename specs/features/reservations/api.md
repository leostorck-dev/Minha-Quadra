# API — Reservas

- `GET /api/reservations?from=<ISO>&to=<ISO>&courtId=&status=` lista até uma semana de agenda, com filtros. `from` é inclusivo e `to` exclusivo.
- `POST /api/reservations` cria reserva ou bloqueio confirmado, calcula preço e retorna `{ reservation }` (201).
- `GET /api/reservations/:id` retorna `{ reservation }`.
- `PATCH /api/reservations/:id` altera horários, quadra, cliente ou observações enquanto o status permite, ou avança `status`.
- `DELETE /api/reservations/:id` cancela uma reserva confirmada ou pendente (204).
- `GET /api/availability?courtId=<uuid>&date=YYYY-MM-DD` retorna intervalos de 30 minutos e a indicação de ocupação; a resposta usa o fuso da arena.

Payload de criação: `{ kind, courtId, customerId, startAt, endAt, notes }`. `kind` é `booking` ou `block`; `customerId` é exigido apenas para reserva. Datas são ISO 8601 com offset explícito. A API rejeita `tenantId`, preço e campos de auditoria enviados pelo cliente. Erros usam `{ error: { code, message } }`; conflito retorna 409 com `RESERVATION_CONFLICT`.
