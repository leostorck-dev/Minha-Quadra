# Aceitação — Financeiro básico

- Proprietário e gerente criam receita ou despesa manual pendente ou paga, com categoria e valor em reais.
- Despesa pendente exige vencimento e pode ser marcada como paga ou cancelada; atrasos são identificados na tela.
- Resumo mensal calcula receitas, despesas, resultado e contas a pagar com todos os lançamentos do mês, mesmo quando a lista está paginada.
- Filtros por mês, tipo e situação funcionam sem misturar dados de arenas.
- Pagamento de reserva cria uma única receita. Estorno cria uma única despesa; ambas permanecem no histórico e afetam os meses correspondentes.
- Recepção e professor não acessam o financeiro. Uma arena não lê nem altera lançamentos de outra.
- Lançamentos automáticos não podem ser alterados pela API financeira.
- Lint, typecheck, testes aplicáveis e build de produção passam.
