# Banco

`tournaments` guarda arena, nome, datas, situação (`draft`, `open`, `closed`) e criador. `tournament_categories` guarda categorias do torneio. `tournament_teams` representa uma dupla inscrita ou retirada. `tournament_team_members` guarda os dois clientes, posição e situação ativa. Uma restrição única parcial em `(category_id, customer_id)` para integrantes ativos impede participação simultânea em duas duplas da mesma categoria, inclusive em concorrência.

As quatro tabelas têm `tenant_id`, RLS de leitura para proprietário, gerente e recepção, e escrita apenas por funções que obtêm a arena do usuário autenticado. Chaves compostas garantem que categoria, dupla e clientes pertençam à mesma arena e torneio.

`tournament_groups`, `tournament_group_teams` e `tournament_matches` guardam os grupos, a posição e nome de cada dupla no sorteio e os pares de adversários. FKs compostas impedem confrontos entre grupos, categorias ou arenas diferentes. A ordem canônica dos IDs e a chave única por par impedem confrontos duplicados. As tabelas têm RLS e apenas leitura para equipe, com escrita via RPC autorizada para gestores.

`draw_tournament_category` bloqueia a linha do torneio, a mesma usada nas inscrições, retirada e fechamento. A geração é atômica, grava `drawn_at` na categoria e recusa repetição. Um trigger impede a reabertura após qualquer sorteio.
