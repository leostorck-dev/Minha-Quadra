# Financeiro básico — MQ-078 a MQ-087

## Objetivo

Registrar receitas e despesas manuais, acompanhar contas a pagar e visualizar o fluxo de caixa e o resumo por mês. Recebimentos e estornos de reservas entram automaticamente no financeiro.

## Regras de negócio

- Valores são positivos em `numeric(10,2)`; o tipo `income` ou `expense` define o efeito no resultado. Resultado do mês = receitas pagas − despesas pagas.
- Lançamentos manuais começam `pending` ou `paid`. Um lançamento pendente pode ser marcado como pago ou cancelado; lançamentos pagos e cancelados ficam imutáveis. Não há exclusão física.
- Despesa pendente exige vencimento. Vencimento anterior à data local da arena indica atraso. O mês de exibição de um pendente é o do vencimento; o mês de um pago é o do recebimento ou pagamento.
- Categorias iniciais são listas fixas por tipo. Valores futuros podem ser adicionados sem migrar dados antigos.
- Pagamento de reserva cria receita paga. Estorno registrado cria despesa paga no mês do estorno, preservando as duas movimentações e o resultado líquido. A aplicação não movimenta dinheiro.
- Lançamentos originados de reservas são imutáveis e únicos por pagamento e evento. Apenas lançamentos manuais podem ser criados ou avançados pela API financeira.
- Proprietário e gerente consultam e lançam o financeiro. Recepção registra pagamentos na agenda, mas não acessa o financeiro completo. Professor não acessa dados financeiros.
- Paginação e filtros por mês, tipo e situação limitam o volume da lista. Resumo do mês sempre considera todas as movimentações do mês, não apenas a página visível.
- Contas bancárias, conciliação, edição de lançamentos pagos, gráficos avançados e gateway ficam para etapas futuras.

Veja [database.md](./database.md), [api.md](./api.md) e [acceptance.md](./acceptance.md).

## Exportação mensal

Proprietário e gerente podem baixar CSV com todos os lançamentos do mês e dos filtros de tipo e situação selecionados, incluindo todas as páginas. O arquivo contém identificador, data de referência da arena, tipo, categoria, descrição, valor em reais, situação, vencimento, pagamento em UTC e origem. Distingue reservas, estornos, mensalidades, aulas e comissões. Pendentes e cancelados permanecem identificados; não são apresentados como pagamentos realizados.

O CSV usa UTF-8 com BOM, ponto e vírgula e duas casas decimais com vírgula. Textos são escapados contra fórmulas. O arquivo vazio contém os cabeçalhos. A leitura em lotes evita truncamento; falha intermediária impede baixar um relatório parcial. A exportação consulta o estado atual e pode refletir alterações simultâneas entre lotes; não constitui um fechamento imutável. Nenhum contato de cliente é incluído.
