# Filtro de cobrança na agenda

OWNER, MANAGER e RECEPTIONIST podem filtrar a agenda por cobrança pendente, paga, estornada, cancelada ou sem cobrança. O filtro Todos preserva reservas e bloqueios. Os demais filtros exibem somente reservas com a situação correspondente.

## Contratos e permissões

- `GET /api/reservations` e `GET /api/reservations/export` aceitam `paymentSituation` opcional; valores: `all`, `pending`, `paid`, `refunded`, `cancelled`, `free`.
- Valor inválido retorna erro de validação. COACH só pode usar `all`; outro valor retorna erro sem consultar dados. A interface de professor não exibe o filtro nem informação de cobrança.
- O filtro é aplicado depois de carregar pagamentos por lotes na consulta já isolada por `tenant_id`. CSV e tela compartilham a mesma função, respeitando período, quadra e status.
- Pendente significa reserva com preço positivo e sem pagamento registrado; cancelada e sem cobrança seguem a lógica já existente. Bloqueios não possuem situação de cobrança.
- Sem migração, sem nova tabela e sem mudança nas políticas RLS.

## Aceitação

Validar cada valor, ausência do parâmetro, rejeição de valor inválido e proteção para COACH. Confirmar paridade da tela, resumo e CSV, além de build, lint e testes existentes.
