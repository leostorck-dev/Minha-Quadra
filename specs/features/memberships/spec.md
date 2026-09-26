# Planos e mensalidades

Gestores cadastram planos com nome, preço mensal e quantidade de aulas (ou ilimitada). Podem desativar planos para novas adesões. Cada cliente pode ter uma assinatura ativa, com preço e limite congelados no momento da adesão. A mensalidade vence no dia da adesão, limitado ao dia 28, e a cobrança seguinte avança um mês após o pagamento. Cobranças em atraso permanecem visíveis e são quitadas em ordem. Gestores podem cancelar assinaturas sem excluir o histórico.

O pagamento é registrado manualmente pela equipe; este fluxo não cobra cartão nem envia mensagens. Cada quitação gera uma receita paga na categoria `Mensalidades` do financeiro.

## Cadastro completo e nomes no histórico

Planos, assinaturas e nomes de clientes são carregados em lotes, evitando cortes automáticos conforme a arena cresce. O consumo é consultado em lotes de até 100 assinaturas. Clientes inativos mantêm seus nomes nas cobranças e pagamentos históricos; somente clientes ativos sem assinatura ativa podem aderir a um plano. A adesão permite buscar pelo nome.

O histórico de pagamentos permite navegar por todos os registros. Recebimentos também permanecem no Financeiro e podem ser consultados e exportados por mês.

## Histórico completo de recebimentos

Gestores consultam todos os pagamentos em páginas de 25, ordenados do registro mais recente ao mais antigo, com filtro por assinatura ativa ou cancelada. Cada linha identifica cliente, plano, vencimento quitado, data de recebimento no fuso da arena, método e valor. Clientes inativos mantêm seu nome. Alterar o filtro retorna à primeira página; erros permitem nova tentativa. Novas quitações atualizam o histórico. Esta consulta não modifica pagamentos.
