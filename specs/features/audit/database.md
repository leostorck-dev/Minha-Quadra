# Banco — Auditoria

`public.audit_logs`: `id`, `tenant_id`, `event`, `entity_type`, `entity_id`, `actor_id`, `actor_name`, `details`, `created_at`.

RLS permite SELECT somente a OWNER e MANAGER do mesmo `tenant_id`. Nenhum privilégio de escrita é concedido a `authenticated`. Uma função de trigger `SECURITY DEFINER` fica no schema não exposto `private`, com `search_path` vazio e execução revogada dos papéis de API. Ela valida o perfil do usuário antes do INSERT e aceita somente as tabelas e eventos previstos.

Índice `(tenant_id, created_at desc, id desc)` atende à listagem paginada. Nenhuma coluna de identificação de cliente, contato ou observação livre é copiada para `details`.
