# Banco inicial — MQ-009 a MQ-013

Status: implementação autorizada pelo pedido de avançar e de apagar o esquema legado.

## Situação anterior

O projeto Supabase `arena-saas` continha tabelas Prisma (`Arena`, `Usuario`, `Quadra`, `Reserva` e outras). Em 24/09/2026 havia 1 arena, 4 usuários legados, 4 quadras e 1 reserva; não havia usuários em Supabase Auth. O proprietário determinou apagar essas tabelas e criar o modelo novo. A migration `rebuild_core_schema` remove as tabelas e enums legados.

## Tabelas desta etapa

- `tenants`: UUID, nome, slug único, usuário proprietário único, status e timestamps.
- `profiles`: UUID igual a `auth.users.id`, tenant obrigatório, nome, email, papel e timestamps.

Papéis administrativos: `OWNER`, `MANAGER`, `RECEPTIONIST`, `COACH`. Clientes ainda não são usuários do painel.

## Permissões

`anon` não recebe permissão de tabela. `authenticated` pode selecionar apenas seu perfil e o tenant vinculado. A criação do primeiro tenant e perfil OWNER é permitida por políticas específicas e realizada pela função transacional `onboard_arena`. Atualização e exclusão seguem bloqueadas. `service_role` mantém acesso administrativo somente no servidor.

## Aceitação

1. As tabelas Prisma e enums legados não existem após a migration.
2. `tenants` e `profiles` têm RLS habilitada.
3. Uma chamada anônima à Data API não lê tenants nem perfis.
4. Um usuário autenticado só vê seu perfil e seu tenant.
5. O banco impede papel inválido e perfil com tenant inexistente.
