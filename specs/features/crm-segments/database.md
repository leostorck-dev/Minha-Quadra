# Banco

`customer_crm` é uma view `security_invoker` sobre `customers` e
`reservations`. Ela expõe as colunas do cliente, número de reservas válidas,
data da última reserva passada, mês de aniversário e existência de reserva
futura. As políticas RLS das tabelas base continuam sendo a barreira de
acesso. O índice `reservations_customer_start_idx` atende a agregação por
arena e cliente.
