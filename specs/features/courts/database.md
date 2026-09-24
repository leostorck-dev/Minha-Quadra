# Banco — Quadras

`courts` possui `id`, `tenant_id`, `name`, `description`, `sport`, `price_per_hour numeric(10,2)`, `status`, `opening_time`, `closing_time`, `created_by`, `created_at` e `updated_at`.

`tenant_id` referencia `tenants`. A chave única `(tenant_id, id)` permite referências compostas por reservas futuras. O banco valida limites de texto, preço, status e horário. RLS permite leitura a `OWNER`, `MANAGER`, `RECEPTIONIST` e `COACH` da mesma arena. Inserção e atualização exigem `OWNER` ou `MANAGER` da mesma arena. O papel `anon` não recebe acesso, e `authenticated` não recebe `DELETE` nem permissão para alterar `tenant_id`, `created_by` ou `created_at`.
