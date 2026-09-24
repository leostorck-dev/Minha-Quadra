# API — Auditoria

`GET /api/audit?type=all|customer|reservation|payment&page=1` retorna `{ items, total, page, pageSize }`, com 25 registros por página, do mais recente ao mais antigo. A página `/audit` usa o mesmo serviço.

Cada item apresenta evento, tipo e ID do registro, usuário responsável, data e detalhes permitidos. O servidor resolve tenant e papel pela sessão; a consulta também é protegida por RLS. A resposta é privada e sem cache. Não há endpoint de escrita.
