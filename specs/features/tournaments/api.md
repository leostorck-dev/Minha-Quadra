# API

- `GET /api/tournaments`: torneios, categorias, duplas, integrantes e clientes ativos da arena.
- `POST /api/tournaments`: `{name, startsOn, endsOn, categories}`. Proprietário ou gerente.
- `PATCH /api/tournaments/[id]`: `{status: "open" | "closed"}`. Proprietário ou gerente.
- `POST /api/tournaments/[id]/teams`: `{categoryId, customerIds: [id, id]}`. Proprietário, gerente ou recepção.
- `PATCH /api/tournaments/[id]/teams/[teamId]`: `{status: "withdrawn"}`. Proprietário, gerente ou recepção.

Respostas de erro seguem `{error: {code, message}}`. O navegador não envia `tenant_id`.
# Sorteio

- `GET /api/tournaments/:id/draw`: grupos, duplas e confrontos do torneio, para proprietário, gerente e recepção.
- `POST /api/tournaments/:id/draw`: `{ "categoryId": "uuid", "groupSize": 3 }`, exclusivo de proprietário/gerente. `groupSize` aceita 3 ou 4. Responde 201 com `groupCount`.
- 400: corpo inválido; 401: sem sessão; 403: papel sem permissão; 404: torneio/categoria não encontrado; 409: inscrições abertas, quantidade fora de 2–64 ou sorteio já realizado.
