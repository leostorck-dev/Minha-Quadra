# API — Clientes

As respostas de sucesso usam JSON. `GET /api/customers?q=&page=&status=` retorna `{ items, total, page, pageSize }`; `status` aceita `active` (padrão), `inactive` ou `all`. `POST` retorna `{ customer }` com status 201. `GET` e `PATCH /api/customers/:id` retornam `{ customer }`. `DELETE` retorna 204.

Campos aceitos em POST: `name`, `phone`, `email`, `birthDate`, `notes`. PATCH também aceita `status`. Campos de identidade do tenant e usuário são rejeitados pela validação de payload.

Erros: `UNAUTHORIZED` 401, `FORBIDDEN` 403, `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `INTERNAL_ERROR` 500.
