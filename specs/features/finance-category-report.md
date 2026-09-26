# Relatório financeiro por categoria

OWNER e MANAGER podem exportar CSV consolidado por tipo, categoria e situação. Quantidade e valor total de cada grupo usam todas as páginas e os filtros atuais (mensal, vencidas ou próximos sete dias, origem, categoria e descrição). Receitas, despesas, pagos, pendentes e cancelados permanecem separados; valores cancelados não representam movimentação efetiva.

Usar centavos inteiros na soma, CSV UTF-8 com BOM, separador ponto e vírgula, decimal com vírgula e proteção de fórmulas. Exportação vazia preserva cabeçalho. Endpoint autenticado existente aceita report=transactions (padrão) ou categories, rejeitando outros valores. Nome do arquivo identifica o consolidado. Sem alteração de banco.

Testar precisão, grupos de situação/tipo, conjunto maior que mil registros, cabeçalho vazio, neutralização de fórmulas e validação do formato.
