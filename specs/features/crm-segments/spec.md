# Segmentação automática de clientes

Segunda entrega do MVP 2. A lista de clientes oferece segmentos calculados
dos dados existentes:

- Sem reserva recente há 15 dias e há 30 dias: cliente com reserva passada,
  mas nenhuma nos respectivos períodos e nenhuma reserva futura ativa.
- Mais de 10 reservas: pelo menos 11 reservas confirmadas, com check-in ou
  concluídas.
- Aniversariantes do mês: mês da data de nascimento no fuso da arena.
- Novos nos últimos 30 dias: data de cadastro recente.

Reservas canceladas e ausências não contam. Uma reserva passada confirmada
serve como aproximação da atividade; o indicador é chamado de última reserva,
pois ainda não prova presença física. Os filtros combinam com nome, etiqueta
e status e usam a paginação existente.
