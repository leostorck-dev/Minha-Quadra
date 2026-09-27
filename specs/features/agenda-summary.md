# Resumo operacional da agenda

Exibir reservas, bloqueios, horas agendadas e cobranças pendentes para os mesmos itens e filtros já carregados na agenda. Sem nova consulta ou migração.

## Regras

- Reservas e bloqueios cancelados ou com falta não entram no resumo. Reservas concluídas continuam contabilizadas.
- Horas somam reserva/bloqueio por quadra e somente a interseção do intervalo com o período exibido. Não representam percentual de ocupação.
- Cobranças pendentes somam preços em centavos de reservas com paymentSituation=pending. Pagos, estornados, gratuitos e bloqueios não entram. O valor segue os filtros da agenda e não representa o saldo geral da arena.
- Professor vê somente contagens e horas, sem indicador financeiro.
- Carregamento e erro ocultam o resumo para não mostrar zeros como resultado válido. Período vazio exibe zeros.

## Aceitação

Testar status cancelado/falta/concluído, bloqueios, pendências/estornos/pagamentos, centavos, intervalos que cruzam limites e quadras simultâneas. Executar lint e build. Preservar isolamento e permissões da API existente.
