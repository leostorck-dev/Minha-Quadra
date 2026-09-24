# Aceitação — Reservas

1. Criar reserva manual com cliente ativo e quadra disponível grava horário e preço calculado.
2. Criar bloqueio ocupa a agenda sem cliente e sem cobrança.
3. Sobreposição exata, parcial pela esquerda ou direita é rejeitada; uma reserva começando no término de outra é permitida.
4. Requisições simultâneas para o mesmo horário não produzem duas reservas ativas.
5. Reservas não podem referenciar cliente ou quadra de outra arena; RLS impede leitura e escrita entre arenas.
6. Cancelar libera o horário; check-in e conclusão seguem as transições permitidas.
7. Agenda diária e semanal mostram reservas e bloqueios com filtros de quadra e status.
8. Disponibilidade respeita horários regulares, estado da quadra e reservas ocupantes.
9. Professor pode consultar; somente proprietário, gerente e recepção podem alterar.
10. Testes automatizados verificam conflito, horários, payload e transições.
