# Banco — Clientes

`customers.tenant_id` é obrigatório e referencia `tenants.id`. `customers.created_by` referencia o usuário que criou o registro e pode ficar nulo se esse usuário for excluído no futuro. O banco exige nome e ao menos um contato.

RLS usa o perfil do usuário autenticado para liberar somente linhas do mesmo tenant aos papéis `OWNER`, `MANAGER` e `RECEPTIONIST`. A política de UPDATE possui `USING` e `WITH CHECK`; concessões por coluna impedem editar `tenant_id` e `created_by` pela Data API.
