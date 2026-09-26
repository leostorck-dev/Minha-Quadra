# API — Financeiro básico

- `GET /api/finance/transactions?month=YYYY-MM&page=1&type=all|income|expense&status=all|pending|paid|cancelled`: retorna `{ items, total, page, pageSize, summary }`. O resumo contém `income`, `expense`, `result` e `payable` do mês.
- `POST /api/finance/transactions`: cria lançamento manual com `{ type, category, description, amount, status, dueDate }`. `amount` é uma string decimal com até duas casas. `status` pode ser `pending` ou `paid`.
- `PATCH /api/finance/transactions/:id`: recebe `{ status: "paid" | "cancelled" }` e avança um lançamento manual pendente.

O servidor resolve o tenant pelo usuário autenticado, exige papel OWNER ou MANAGER e rejeita campos extras como `tenantId`, `sourceType` e `paidAt`. Respostas de erro seguem `{ error: { code, message } }`.

## Exportação

`GET /api/finance/export?month=2026-09&type=all&status=all` exige proprietário ou gerente. Aceita os mesmos filtros da listagem; `page` não limita o conteúdo exportado. Retorna CSV completo em ordem de data de referência, criação e identificador, com `Content-Disposition: attachment`, `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`. Parâmetros inválidos retornam 400; sem sessão, 401; papel não permitido, 403. A arena deriva da sessão autenticada e continua sujeita às políticas RLS.
