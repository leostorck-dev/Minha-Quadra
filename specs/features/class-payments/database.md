# Banco

`class_payments`: arena, aula única, valor congelado no momento do pagamento, método, status, pagador, datas e responsável pelo estorno. A escrita ocorre apenas por funções que conferem papel e arena, com bloqueio da linha da aula ou do pagamento. RLS permite leitura apenas à equipe financeira da arena.

`financial_transactions` recebe uma receita `class` ao pagar e uma despesa `class_refund` ao estornar, ambas ligadas ao ID do pagamento. Não se altera ou apaga um lançamento já registrado.
