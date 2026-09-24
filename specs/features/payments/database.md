# Banco — Pagamentos

`payments`: `id`, `tenant_id`, `reservation_id` único, `amount numeric(10,2)`, `method`, `status` (`paid` ou `refunded`), `created_by`, `created_at`, `refunded_by`, `refunded_at`. A ausência de linha representa cobrança pendente; reserva cancelada sem linha representa cobrança cancelada. O vínculo composto `(tenant_id, reservation_id)` impede mistura entre arenas.

`payment_events`: histórico imutável com `payment_id`, `tenant_id`, `event` (`paid` ou `refunded`), `actor_id`, `created_at`. O banco cria os eventos por gatilho; clientes não podem escrevê-los.

Gatilhos verificam tipo e estado da reserva, calculam o valor no servidor, impedem segundo pagamento e transições inválidas, e bloqueiam mudança dos dados comerciais da reserva após pagamento. RLS restringe leitura e escrita à equipe autorizada da mesma arena. Índices cobrem lista por arena e data e histórico por pagamento.
