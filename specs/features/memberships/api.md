# API

- `GET /api/memberships`: planos, assinaturas, pagamentos recentes e clientes elegíveis da arena.
- `POST /api/memberships/plans`: cria plano.
- `PATCH /api/memberships/plans/[id]`: ativa ou desativa plano.
- `POST /api/memberships`: cria assinatura para cliente.
- `PATCH /api/memberships/[id]`: cancela assinatura.
- `POST /api/memberships/[id]/payments`: quita o vencimento aberto.

Todas exigem OWNER/MANAGER. Erros de validação retornam 400, conflito 409 e ausência 404.
