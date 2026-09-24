# Minha Quadra

Plataforma de gestão de arenas esportivas. A fundação multiempresa, o acesso à conta e os módulos de clientes, quadras, agenda e pagamentos manuais estão implementados; os demais módulos seguirão as [specs](./specs/).

## Requisitos

- Node.js compatível com Next.js 16
- npm
- Projeto Supabase com as migrations de `supabase/migrations` aplicadas

## Executar localmente

1. Execute `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do painel Connect do Supabase.
4. Execute `npm run dev` e abra `http://localhost:3000`.

O projeto local está configurado para o Supabase `arena-saas`; `.env.local` é privado e não deve ser commitado. Para outro ambiente, use os valores do projeto correspondente.

## Deploy na Vercel

O projeto está vinculado à Vercel em `leo-storck/arena-saas`. A URL de produção é https://arena-saas-ten.vercel.app. As variáveis públicas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão configuradas para Production, Preview e Development no projeto Vercel.

Para que confirmação de email e recuperação de senha funcionem em produção, defina **Site URL** como `https://arena-saas-ten.vercel.app` e adicione `https://arena-saas-ten.vercel.app/auth/confirm` e `https://arena-saas-ten.vercel.app/auth/confirm?next=/reset-password` em **Supabase Auth → URL Configuration → Redirect URLs**. Mantenha as URLs locais permitidas para desenvolvimento.

O projeto atual exige confirmação de email. A rota `/auth/confirm` aceita código PKCE ou `token_hash` e redireciona para o cadastro da arena. O serviço de email padrão do Supabase tem limite baixo; para uso em produção, configure SMTP próprio.

Fluxo disponível: `/signup` → confirmação de email → `/login` ou `/onboarding` → `/dashboard`. `/forgot-password` permite solicitar recuperação de senha. Em `/customers`, proprietário, gerente e recepção podem cadastrar, buscar, editar e inativar clientes da própria arena. Em `/courts`, todos os papéis administrativos podem consultar quadras; proprietário e gerente podem criar, editar horários e preço, colocar em manutenção e desativar ou reativar. Em `/agenda`, a equipe consulta a agenda diária e semanal, com filtros, disponibilidade, reservas manuais, bloqueios, cancelamento, check-in e conclusão. Cada reserva mostra a situação da cobrança; proprietário, gerente e recepção podem registrar pagamento manual em Pix, dinheiro, crédito ou débito e registrar estorno com histórico. Reservas recorrentes, online e gateway ficam para etapas futuras.

## Comandos

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: build de produção.
- `npm run lint`: ESLint.
- `npm run typecheck`: verificação TypeScript.
- `npm run format:check`: conferência do Prettier.
- `npm run format`: formatação do projeto.
- `npm test`: validação automatizada de clientes, quadras, conflitos e regras de reservas.

Os testes de integração em [tests/reservations.database.sql](./tests/reservations.database.sql) e [tests/payments.database.sql](./tests/payments.database.sql) validam regras de reservas e pagamentos no PostgreSQL. Execute-os em um projeto de desenvolvimento pelo editor SQL ou pelo conector Supabase; as transações terminam em `ROLLBACK`.

## Estrutura

- `src/app`: rotas Next.js.
- `src/lib/supabase`: clientes Supabase.
- `src/components`, `src/features`, `src/services`, `src/types`, `src/hooks`: código compartilhado e módulos futuros.
- `supabase/migrations`: migrations versionadas do banco.
- `specs`: visão, arquitetura, constituição e specs de features.
- `tests`: testes automatizados.

Leia [constitution.md](./specs/constitution.md) antes de implementar uma feature. O próximo módulo funcional é financeiro básico; convites de funcionários ainda precisam de spec própria.
