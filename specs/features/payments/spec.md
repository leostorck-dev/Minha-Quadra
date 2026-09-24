# Pagamentos de reservas — MQ-069 a MQ-077

## Objetivo

Registrar manualmente o recebimento integral de uma reserva, consultar a situação de cobrança e registrar estorno, sem integração com gateway.

## Regras

- Cada reserva do tipo `booking` começa com cobrança pendente. Bloqueios não possuem cobrança.
- Apenas uma cobrança integral pode ser registrada por reserva. A quantia é o preço da reserva calculado no banco; o cliente da API não escolhe valor nem arena.
- Métodos: `PIX`, `CASH`, `CREDIT_CARD`, `DEBIT_CARD`. O operador registra um recebimento já realizado; esta etapa não processa cartões nem Pix.
- Uma cobrança registrada pode ser marcada como estornada uma única vez. O estorno é um registro administrativo; a devolução real do dinheiro é feita fora do sistema.
- Reserva cancelada sem pagamento aparece como cobrança cancelada. Se houver pagamento, ele permanece visível até o estorno. Reservas gratuitas aparecem como quitadas sem transação.
- Após um pagamento, horário, quadra, cliente e preço da reserva não podem ser alterados. Isso preserva a conciliação. O cancelamento da reserva continua permitido.
- Proprietário, gerente e recepção podem consultar, registrar e estornar. Professor não vê dados financeiros.
- Toda alteração registra usuário e horário no histórico. Não há exclusão física.
- Pagamento parcial, parcelamento, contas financeiras e gateway ficam para etapas futuras.

## Contratos

Veja [database.md](./database.md), [api.md](./api.md) e [acceptance.md](./acceptance.md).
