# Quadras — MQ-042 a MQ-050

## Objetivo

Permitir que a arena cadastre e mantenha suas quadras, seus horários regulares e seu preço padrão por hora. Estes dados serão usados pelo módulo de agenda e reservas.

## Regras de negócio

- Cada quadra pertence a uma única arena. O tenant é resolvido pela sessão, nunca pelo payload.
- Nome (2 a 120 caracteres) e modalidade (2 a 60 caracteres) são obrigatórios. A descrição é opcional (até 1000 caracteres).
- O preço padrão é um valor em BRL com duas casas decimais, entre R$ 0,00 e R$ 99.999,99. Zero permite quadras gratuitas.
- A abertura e o fechamento são horários locais da arena, em intervalos de minuto. A abertura deve ser anterior ao fechamento; horários que cruzam a meia-noite ficam para uma evolução futura.
- `available` indica uso normal, `maintenance` bloqueia disponibilidade futura e `inactive` retira a quadra da operação. Desativar é reversível; não há exclusão física na interface nem na API.
- Proprietário e gerente podem criar, alterar horários e preço, colocar em manutenção e desativar/reativar. Recepção e professor podem consultar as quadras.
- Preços especiais por horário, dia e associação ficam para a etapa de reservas ou posterior.

## Dados e API

Veja [database.md](./database.md) e [api.md](./api.md).

## Aceitação

Veja [acceptance.md](./acceptance.md).
