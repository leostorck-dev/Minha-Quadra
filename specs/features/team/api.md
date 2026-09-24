# API

- `POST /api/settings`: cria convite com `email` e `role`; OWNER.
- `PATCH /api/settings` com `action: rename`: altera `name`; OWNER.
- `PATCH /api/settings` com `action: revoke`: revoga `id`; OWNER.
- `DELETE /api/settings`: remove o membro `id`; OWNER.
- `join_arena(p_token, member_name)`: aceita o convite via RPC autenticada.

As respostas privadas usam `Cache-Control: private, no-store`.
