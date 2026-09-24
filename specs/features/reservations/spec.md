# Agenda e reservas — MQ-051 a MQ-068

## Objetivo

Operar a agenda diária e semanal da arena, criar reservas manuais e bloqueios, consultar disponibilidade e acompanhar o ciclo de vida de uma reserva.

## Regras de negócio

- Cada reserva pertence a uma arena e referencia uma quadra da mesma arena. Reservas de clientes referenciam um cliente da mesma arena; bloqueios não possuem cliente.
- Horários são armazenados como instantes com fuso (`timestamptz`). O fuso IANA da arena, inicialmente `America/Sao_Paulo`, define o dia e o horário de funcionamento.
- Uma reserva ou bloqueio começa e termina no mesmo dia local, em intervalos de 30 minutos, dura de 30 minutos a 12 horas e fica dentro do horário regular da quadra.
- Apenas quadras `available` e clientes `active` aceitam novas reservas. Alterar uma reserva ativa para uma quadra indisponível é rejeitado.
- Reservas pendentes, confirmadas ou com check-in ocupam a quadra. Um bloqueio confirmado também ocupa. A regra de conflito é `existing.start_at < new.end_at AND existing.end_at > new.start_at`. Intervalos encostados são permitidos. O banco aplica a regra atomicamente com restrição de exclusão, inclusive sob requisições concorrentes.
- Reservas manuais nascem `confirmed`; bloqueios nascem `confirmed`. O preço total é calculado a partir do preço padrão da quadra e da duração, arredondado para centavos no servidor. Preços especiais ficam para etapa posterior.
- Fluxo de reserva: `pending` → `confirmed` ou `cancelled`; `confirmed` → `checked_in`, `cancelled` ou `no_show`; `checked_in` → `completed`. Estados finais não voltam à agenda ativa. Bloqueios podem somente ser cancelados.
- Proprietário, gerente e recepção podem criar, editar, cancelar e avançar status. Professor consulta a agenda.
- Reservas recorrentes, reservas online, pagamentos, preços especiais e visualização mensal ficam para etapas posteriores.

## Dados e API

Veja [database.md](./database.md) e [api.md](./api.md).

## Aceitação

Veja [acceptance.md](./acceptance.md).
