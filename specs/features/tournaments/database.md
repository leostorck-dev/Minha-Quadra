# Banco

`tournaments` guarda arena, nome, datas, situação (`draft`, `open`, `closed`) e criador. `tournament_categories` guarda categorias do torneio. `tournament_teams` representa uma dupla inscrita ou retirada. `tournament_team_members` guarda os dois clientes, posição e situação ativa. Uma restrição única parcial em `(category_id, customer_id)` para integrantes ativos impede participação simultânea em duas duplas da mesma categoria, inclusive em concorrência.

As quatro tabelas têm `tenant_id`, RLS de leitura para proprietário, gerente e recepção, e escrita apenas por funções que obtêm a arena do usuário autenticado. Chaves compostas garantem que categoria, dupla e clientes pertençam à mesma arena e torneio.
