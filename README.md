# Minha Quadra

Plataforma de gestão de arenas esportivas. O primeiro MVP reúne conta, equipe, clientes, quadras, agenda, pagamentos manuais, financeiro, dashboard e auditoria. O MVP 2 começa com etiquetas e segmentos automáticos de clientes.

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

Fluxo disponível: `/signup` → confirmação de email → `/login` ou `/onboarding` → `/dashboard`. `/forgot-password` permite solicitar recuperação de senha. Em `/customers`, proprietário, gerente e recepção podem cadastrar, buscar, editar e inativar clientes da própria arena, adicionar etiquetas e filtrar por elas. Em `/courts`, todos os papéis administrativos podem consultar quadras; proprietário e gerente podem criar, editar horários e preço, colocar em manutenção e desativar ou reativar. Em `/agenda`, a equipe consulta a agenda diária e semanal, com filtros, disponibilidade, reservas manuais, bloqueios, cancelamento, check-in e conclusão. Cada reserva mostra a situação da cobrança; proprietário, gerente e recepção podem registrar pagamento manual em Pix, dinheiro, crédito ou débito e registrar estorno com histórico. Em `/finance`, proprietário e gerente podem acompanhar receitas, despesas, contas a pagar e resultado mensal, além de criar lançamentos manuais. Pagamentos de reservas e estornos entram automaticamente como movimentações separadas no fluxo de caixa. Em `/dashboard`, a equipe vê reservas, ocupação e próximas reservas; proprietário e gerente também veem receita e ticket médio. Em `/audit`, proprietário e gerente consultam o histórico de alterações em clientes, reservas e pagamentos. Reservas recorrentes, online e gateway ficam para etapas futuras.

Em `/customers`, os segmentos automáticos mostram clientes sem reserva recente, com mais de 10 reservas, aniversariantes do mês e clientes novos. Os filtros combinam com nome, status e etiqueta.

Em `/classes`, a equipe agenda aulas, registra presença e acompanha professores. Proprietário, gerente e recepção podem registrar uma cobrança avulsa pelo valor total da aula e estorná-la; ambos os eventos aparecem no financeiro. Aulas incluídas em mensalidades são controladas pelo consumo exibido em `/memberships`, e a cobrança avulsa é uma decisão manual da arena.

Na mesma página, proprietário e gerente podem registrar a comissão paga de cada aula concluída. A liquidação usa a regra congelada quando a aula foi agendada e lança uma despesa no financeiro. O professor pode consultar as próprias comissões.

Em `/tournaments`, proprietário e gerente criam torneios com categorias e controlam a abertura das inscrições. A equipe cadastra ou retira duplas de clientes, com bloqueio de inscrições repetidas na mesma categoria. Grupos, confrontos e resultados ficam para as próximas etapas.

## Comandos

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: build de produção.
- `npm run lint`: ESLint.
- `npm run typecheck`: verificação TypeScript.
- `npm run format:check`: conferência do Prettier.
- `npm run format`: formatação do projeto.
- `npm test`: validação automatizada de clientes, quadras, reservas e lançamentos financeiros.

Os testes de integração em [tests/crm-tags.database.sql](./tests/crm-tags.database.sql), [tests/reservations.database.sql](./tests/reservations.database.sql), [tests/payments.database.sql](./tests/payments.database.sql), [tests/finance.database.sql](./tests/finance.database.sql), [tests/dashboard.database.sql](./tests/dashboard.database.sql) e [tests/audit.database.sql](./tests/audit.database.sql) cobrem o banco. Execute-os em um projeto de desenvolvimento pelo editor SQL ou pelo conector Supabase; as transações terminam em `ROLLBACK`.

## Estrutura

- `src/app`: rotas Next.js.
- `src/lib/supabase`: clientes Supabase.
- `src/components`, `src/features`, `src/services`, `src/types`, `src/hooks`: código compartilhado e módulos futuros.
- `supabase/migrations`: migrations versionadas do banco.
- `specs`: visão, arquitetura, constituição e specs de features.
- `tests`: testes automatizados.

Leia [constitution.md](./specs/constitution.md) antes de implementar uma feature. Convites de funcionários, reservas online e gateway de pagamento ainda precisam de etapas próprias.
