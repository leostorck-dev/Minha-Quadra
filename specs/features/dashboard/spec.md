# Painel gerencial — MQ-088 a MQ-097

## Objetivo

Mostrar a situação atual da arena em uma tela responsiva, com indicadores operacionais e, para proprietário ou gerente, financeiros.

## Regras

- A data de referência usa o fuso horário da arena. Reservas do dia incluem somente `booking` não cancelada nem marcada como ausência.
- Clientes ativos contam cadastros da própria arena com status `active`.
- Ocupação mensal é a duração das reservas válidas em quadras disponíveis dividida pelas horas de funcionamento dessas quadras no mês, descontados os bloqueios. O percentual é uma estimativa da agenda do mês inteiro.
- Próximas reservas são até cinco `booking` futuras não canceladas nem marcadas como ausência, em ordem cronológica.
- Receita diária, receita mensal e gráfico de seis meses somam receitas pagas do financeiro. Estornos permanecem despesas, como no fluxo de caixa.
- Ticket médio considera pagamentos de reservas ainda pagos, registrados no mês, divididos pela quantidade desses pagamentos. Sem pagamentos, o valor é zero.
- Proprietário e gerente veem os indicadores financeiros. Recepção e professor veem apenas os indicadores operacionais.
- Todos os números são calculados no banco com o tenant do perfil autenticado e respeitam RLS. A API não aceita `tenant_id` nem data fornecida pelo navegador.

Veja [database.md](./database.md), [api.md](./api.md) e [acceptance.md](./acceptance.md).
