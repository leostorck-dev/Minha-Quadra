# Isolamento multiempresa

Um usuário administrativo tem um perfil ligado a exatamente um tenant no Alpha 0.1. A identidade vem de Supabase Auth (`auth.uid()`), nunca de um `tenant_id` enviado pelo navegador. O primeiro proprietário cria o tenant por `onboard_arena`; o banco associa o tenant ao usuário autenticado e cria seu perfil OWNER na mesma transação.

O acesso aos dados é verificado em duas camadas: no servidor, antes da operação, e por políticas RLS no PostgreSQL. O perfil é visível apenas ao próprio usuário. A política de tenant usa esse perfil para liberar somente a arena associada.

As futuras tabelas de clientes, quadras, reservas, pagamentos e finanças terão `tenant_id` obrigatório, índice nessa coluna e políticas equivalentes. Chaves estrangeiras devem impedir referência cruzada entre tenants.
