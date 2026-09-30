# Minha Quadra

Plataforma de gestão de arenas esportivas. O primeiro MVP reúne conta, equipe, clientes, quadras, agenda, pagamentos manuais, financeiro, dashboard e auditoria. O MVP 2 começa com etiquetas e segmentos automáticos de clientes.

## Requisitos

- Node.js 22.6 ou superior (veja `.nvmrc`)
- npm
- Projeto Supabase com as migrations de `supabase/migrations` aplicadas

## Executar localmente

1. Execute `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os valores do painel Connect do Supabase. Ajuste também `NEXT_PUBLIC_APP_URL` para a URL pública do ambiente.
4. Execute `npm run dev` e abra `http://localhost:3000`.

`SIGNUP_MODE` controla novos cadastros: `open` libera o cadastro público, `invite` exige um link de convite e `closed` desativa a criação de contas. Sem configuração, produção usa `invite` e desenvolvimento usa `open`. `NEXT_PUBLIC_DEMO_URL` é opcional, aceita somente HTTP/HTTPS e o botão de demonstração só aparece quando houver um destino válido configurado.

O projeto local está configurado para o Supabase `arena-saas`; `.env.local` é privado e não deve ser commitado. Para outro ambiente, use os valores do projeto correspondente.

## Deploy na Vercel

O projeto está vinculado à Vercel em `leo-storck/arena-saas`. A URL de produção é https://arena-saas-ten.vercel.app. As variáveis públicas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão configuradas para Production, Preview e Development no projeto Vercel.

Para que confirmação de email e recuperação de senha funcionem em produção, defina **Site URL** como `https://arena-saas-ten.vercel.app` e adicione `https://arena-saas-ten.vercel.app/auth/confirm` e `https://arena-saas-ten.vercel.app/auth/confirm?next=/reset-password` em **Supabase Auth → URL Configuration → Redirect URLs**. Mantenha as URLs locais permitidas para desenvolvimento.

O projeto atual exige confirmação de email. A rota `/auth/confirm` aceita código PKCE ou `token_hash` e redireciona para o cadastro da arena. O serviço de email padrão do Supabase tem limite baixo; para uso em produção, configure SMTP próprio.

Fluxo disponível: `/signup` → confirmação de email → `/login` ou `/onboarding` → `/dashboard`. `/forgot-password` permite solicitar recuperação de senha. Em `/customers`, proprietário, gerente e recepção podem cadastrar, buscar, editar e inativar clientes da própria arena, adicionar etiquetas e filtrar por elas. Em `/courts`, todos os papéis administrativos podem consultar quadras; proprietário e gerente podem criar, editar horários e preço, colocar em manutenção e desativar ou reativar. Em `/agenda`, a equipe consulta a agenda diária e semanal, com filtros, disponibilidade, reservas manuais, bloqueios, cancelamento, check-in e conclusão. Cada reserva mostra a situação da cobrança; proprietário, gerente e recepção podem registrar pagamento manual em Pix, dinheiro, crédito ou débito e registrar estorno com histórico. Em `/finance`, proprietário e gerente podem acompanhar receitas, despesas, contas a pagar e resultado mensal, além de criar lançamentos manuais. Pagamentos de reservas e estornos entram automaticamente como movimentações separadas no fluxo de caixa. Em `/dashboard`, a equipe vê reservas, ocupação e próximas reservas; proprietário e gerente também veem receita e ticket médio. Em `/audit`, proprietário e gerente consultam o histórico de alterações em clientes, reservas e pagamentos. Reservas recorrentes e gateway de pagamento ficam para etapas futuras.

O proprietário pode ativar em `/settings` uma página pública em `/reservar/[slug]`. O jogador consulta horários livres e envia uma solicitação sem pagamento. A solicitação aparece em `/requests`; ao aprovar, o sistema cria o cliente e a reserva na agenda, e ao recusar exige um motivo. O jogador acompanha a decisão no mesmo navegador por um identificador mantido localmente, sem expor esse identificador na URL. A solicitação não representa cobrança nem confirmação automática.

Em `/customers`, os segmentos automáticos mostram clientes sem reserva recente, com mais de 10 reservas, aniversariantes do mês e clientes novos. Os filtros combinam com nome, status e etiqueta.

Em `/classes`, a equipe agenda aulas, registra presença e acompanha professores. Proprietário, gerente e recepção podem registrar uma cobrança avulsa pelo valor total da aula e estorná-la; ambos os eventos aparecem no financeiro. Aulas incluídas em mensalidades são controladas pelo consumo exibido em `/memberships`, e a cobrança avulsa é uma decisão manual da arena.

Na mesma página, proprietário e gerente podem registrar a comissão paga de cada aula concluída. A liquidação usa a regra congelada quando a aula foi agendada e lança uma despesa no financeiro. O professor pode consultar as próprias comissões.

Em `/tournaments`, proprietário e gerente criam torneios com categorias e controlam a abertura das inscrições. A equipe cadastra ou retira duplas de clientes, com bloqueio de inscrições repetidas na mesma categoria. A equipe pode sortear grupos, registrar e corrigir resultados com histórico, resolver empates, gerar eliminatórias, disputar terceiro lugar e exportar classificação, partidas e pódio em CSV. O histórico de torneios possui busca, filtros e paginação.

Em `/finance`, a exportação CSV inclui todas as páginas do mês e respeita os filtros. Aulas têm histórico paginado com chamada completa; mensalidades preservam nomes de clientes inativos e oferecem busca para novas adesões.

## Comandos

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: build de produção.
- `npm run lint`: ESLint.
- `npm run typecheck`: verificação TypeScript.
- `npm run format:check`: conferência do Prettier.
- `npm run format`: formatação do projeto.
- `npm test`: executa toda a suíte unitária em `tests/*.test.mjs`.
- `npm run check`: formatação, lint, tipagem e testes em sequência.

O workflow em `.github/workflows/ci.yml` repete essas verificações e o build em todo pull request e push na branch `main`.

Os testes de integração em [tests/crm-tags.database.sql](./tests/crm-tags.database.sql), [tests/reservations.database.sql](./tests/reservations.database.sql), [tests/payments.database.sql](./tests/payments.database.sql), [tests/finance.database.sql](./tests/finance.database.sql), [tests/dashboard.database.sql](./tests/dashboard.database.sql) e [tests/audit.database.sql](./tests/audit.database.sql) cobrem o banco. Execute-os em um projeto de desenvolvimento pelo editor SQL ou pelo conector Supabase; as transações terminam em `ROLLBACK`.

## Estrutura

- `src/app`: rotas Next.js.
- `src/lib/supabase`: clientes Supabase.
- `src/components`, `src/features`, `src/services`, `src/types`, `src/hooks`: código compartilhado e módulos futuros.
- `supabase/migrations`: migrations versionadas do banco.
- `specs`: visão, arquitetura, constituição e specs de features.
- `tests`: testes automatizados.

Leia [constitution.md](./specs/constitution.md) antes de implementar uma feature. Convites de funcionários, permissões e a página pública de solicitações estão disponíveis nas configurações. Cobrança online e gateway de pagamento continuam fora do MVP atual.
