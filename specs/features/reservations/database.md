# Banco — Reservas

`tenants.timezone` usa um nome de fuso IANA, com padrão `America/Sao_Paulo`.

`reservations`: `id`, `tenant_id`, `court_id`, `customer_id`, `kind`, `start_at`, `end_at`, `status` (`reservation_status`), `price numeric(10,2)`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`.

Chaves estrangeiras compostas `(tenant_id, court_id)` e `(tenant_id, customer_id)` impedem vínculos entre arenas. Restrição GiST de exclusão em `court_id` e `tstzrange(start_at, end_at, '[)')` impede sobreposição de reservas que ocupam a quadra. RLS restringe leitura à equipe da arena e escrita a proprietário, gerente e recepção. Não há permissão `DELETE` físico. Gatilho verifica horário, quadra, cliente e transições de status, e registra `updated_by`.
