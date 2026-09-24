# Constituição de desenvolvimento — Minha Quadra

Status: rascunho inicial para revisão.

## 1. Stack

Next.js 16, React, TypeScript, Tailwind CSS, Supabase e PostgreSQL. Antes de alterar APIs do Next.js, consultar os guias da versão instalada em `node_modules/next/dist/docs/`.

## 2. Desenvolvimento orientado por especificações

Cada feature relevante deve ter objetivo, regras de negócio, modelo de dados, contrato de API, permissões, critérios de aceitação e testes antes da implementação. A spec precisa ser revisada e aprovada antes do código da feature.

## 3. Isolamento entre arenas

Toda entidade pertencente a uma arena deve conter `tenant_id`. O cliente não escolhe o tenant de uma operação administrativa: ele é obtido do perfil do usuário autenticado. Consultas, mutações e políticas RLS devem limitar dados ao tenant autorizado. Nunca usar somente filtros de interface como barreira de segurança.

## 4. Autenticação e autorização

Operações com dados privados exigem identidade verificada, papel autorizado, tenant resolvido e payload validado. A permissão deve ser verificada no servidor e reforçada por RLS. O papel `CUSTOMER` fica fora do painel administrativo inicial.

## 5. Banco de dados

Alterações de esquema devem usar migrations versionadas em `supabase/migrations/`. Nunca alterar o banco de produção manualmente. Valores monetários usam `numeric` no PostgreSQL e política explícita de arredondamento na aplicação.

## 6. Código e API

Usar TypeScript estrito e evitar `any` sem justificativa. Separar interface, validação, regras de negócio e acesso a dados. Respostas de erro da API devem usar `{ error: { code, message } }`, com códigos estáveis para o cliente.

## 7. Testes e revisão

Regras críticas, especialmente conflito de horários, autorização e isolamento de tenant, exigem testes automatizados. Ao concluir uma task, executar lint, typecheck e testes aplicáveis; registrar decisões e pendências.

## 8. Privacidade e auditoria

Coletar apenas dados necessários, restringir acesso e planejar exportação e anonimização. Mudanças em reservas, pagamentos e dados importantes de clientes devem identificar o usuário responsável em logs de auditoria.
