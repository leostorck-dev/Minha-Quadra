# API

- `POST /api/customers`: aceita `tags?: string[]`.
- `PATCH /api/customers/:id`: aceita `tags?: string[]`; uma lista vazia
  remove todas as etiquetas.
- `GET /api/customers?tag=mensalista`: combina filtro de etiqueta com nome,
  status e paginação.

Respostas de cliente incluem `tags: string[]`. OWNER, MANAGER e
RECEPTIONIST mantêm as permissões atuais; COACH não acessa esta API.
