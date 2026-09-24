# API — Quadras

- `GET /api/courts?q=&status=` lista quadras da arena; `status` aceita `available`, `maintenance`, `inactive` ou `all` (padrão).
- `POST /api/courts` cria e retorna `{ court }` com status 201.
- `GET /api/courts/:id` retorna `{ court }`.
- `PATCH /api/courts/:id` altera campos enviados e retorna `{ court }`.
- `DELETE /api/courts/:id` desativa a quadra e retorna 204. `PATCH` com status `available` ou `maintenance` reativa.

Campos de criação: `name`, `sport`, `description`, `pricePerHour` (string decimal em BRL), `openingTime` e `closingTime` (`HH:mm`). Atualização parcial também aceita `status`. O payload não aceita `tenantId`, `createdBy` nem chaves desconhecidas.

Erros seguem `{ error: { code, message } }`. Leitura exige sessão e papel administrativo ou professor; escrita exige proprietário ou gerente. Respostas privadas não são armazenadas em cache.
