# Banco

`coach_commission_payouts` guarda arena, aula única, professor, valor, método, responsável e data. O valor é calculado no PostgreSQL a partir de `class_sessions.price`, `commission_type` e `commission_value`, com arredondamento a centavos. A função de liquidação bloqueia a aula, valida arena e papel, e grava a despesa `coach_commission` na mesma transação. RLS permite leitura aos gestores da arena e ao professor vinculado à aula; somente gestores executam a função de escrita.
