# API

- `GET /api/tournaments`: torneios, categorias, duplas, integrantes e clientes ativos da arena.
- `POST /api/tournaments`: `{name, startsOn, endsOn, categories}`. Proprietário ou gerente.
- `PATCH /api/tournaments/[id]`: `{status: "open" | "closed"}`. Proprietário ou gerente.
- `POST /api/tournaments/[id]/teams`: `{categoryId, customerIds: [id, id]}`. Proprietário, gerente ou recepção.
- `PATCH /api/tournaments/[id]/teams/[teamId]`: `{status: "withdrawn"}`. Proprietário, gerente ou recepção.

Respostas de erro seguem `{error: {code, message}}`. O navegador não envia `tenant_id`.
