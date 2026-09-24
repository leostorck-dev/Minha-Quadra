# Arquitetura inicial

Status: base implementada; clientes disponível, demais módulos operacionais pendentes.

## Aplicação

- `src/app`: rotas e composição de telas no App Router.
- `src/components`: componentes de interface compartilhados.
- `src/features`: módulos de negócio por domínio.
- `src/lib/supabase`: clientes Supabase de navegador e servidor.
- `src/services`: integrações e serviços compartilhados.
- `src/types`: tipos compartilhados.
- `src/hooks`: hooks de interface, quando necessários.
- `supabase/migrations`: alterações versionadas do banco.
- `tests`: testes de regras e integração.

## Segurança multiempresa

O perfil vincula `auth.users.id` a um tenant e um papel. A API deriva `tenant_id` desse perfil após verificar a identidade. Tabelas de dados da arena usam `tenant_id` e políticas RLS. Chaves secretas do Supabase ficam somente no servidor; a chave publicável é usada com RLS.

## Supabase e sessão

Os clientes de navegador e servidor usam cookies de sessão. O proxy atualiza tokens nas rotas de autenticação e painel. Cada página privada confirma a identidade com `getClaims()` e consulta o perfil com RLS antes de mostrar dados da arena.

## Conflito de reservas

A verificação de sobreposição deve ocorrer no banco em operação atômica para evitar duas reservas simultâneas no mesmo horário. A regra de intervalos é `existing.start_at < new.end_at AND existing.end_at > new.start_at`; horários adjacentes são permitidos.
