# API — Pagamentos

- `GET /api/reservations/:id/payment`: retorna `{ payment, events, situation }`. `payment` é `null` enquanto não há recebimento; `situation` é `pending`, `paid`, `refunded`, `cancelled` ou `free`.
- `POST /api/reservations/:id/payment`: recebe `{ method }` e registra o valor integral da reserva. Retorna 201. Aceita apenas os quatro métodos previstos.
- `PATCH /api/reservations/:id/payment`: recebe `{ status: "refunded" }` e registra o estorno administrativo. Retorna o pagamento atualizado.

Todas as rotas exigem proprietário, gerente ou recepção. O servidor resolve o tenant pelo perfil, valida UUID e payload, e retorna erros em `{ error: { code, message } }`. Tentativa de duplicar pagamento ou de pagar reserva inválida retorna 409. Nenhum endpoint apaga registros.
