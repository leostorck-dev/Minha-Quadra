# API

- `GET /api/memberships`: planos, assinaturas, consumo de aulas e nomes/status dos clientes da arena. Pagamentos são consultados pela rota paginada abaixo.
- `POST /api/memberships/plans`: cria plano.
- `PATCH /api/memberships/plans/[id]`: ativa ou desativa plano.
- `POST /api/memberships`: cria assinatura para cliente.
- `PATCH /api/memberships/[id]`: cancela assinatura.
- `POST /api/memberships/[id]/payments`: quita o vencimento aberto.

Todas exigem OWNER/MANAGER. Erros de validação retornam 400, conflito 409 e ausência 404.

- `GET /api/memberships/payments?page=1&membershipId=uuid`: proprietário/gerente consulta pagamentos da própria arena, com filtro opcional por assinatura. Retorna `items`, `count`, `page` e `pageSize` (25), em ordem decrescente de `paid_at`, com `id` como desempate. Página inválida ou UUID inválido: 400; sem sessão: 401; papel não autorizado: 403. Assinatura de outra arena não retorna registros.
