# API

- `GET /api/tournaments`: torneios, categorias, duplas, integrantes e clientes ativos da arena.
- `POST /api/tournaments`: `{name, startsOn, endsOn, categories}`. Proprietário ou gerente.
- `PATCH /api/tournaments/[id]`: `{status: "open" | "closed"}`. Proprietário ou gerente.
- `POST /api/tournaments/[id]/teams`: `{categoryId, customerIds: [id, id]}`. Proprietário, gerente ou recepção.
- `PATCH /api/tournaments/[id]/teams/[teamId]`: `{status: "withdrawn"}`. Proprietário, gerente ou recepção.

Respostas de erro seguem `{error: {code, message}}`. O navegador não envia `tenant_id`.
# Sorteio

## Exportação

- `GET /api/tournaments/:id/export?kind=standings|matches|podium`: proprietário, gerente e recepção baixam CSV UTF-8 com BOM, `Content-Disposition: attachment` e `Cache-Control: private, no-store`.
- Tipo inválido: 400; sem sessão: 401; papel proibido: 403; torneio inexistente/de outra arena: 404.
- Todos os registros são consultados com o tenant da sessão e RLS. O nome do arquivo usa apenas UUID validado e o tipo permitido.

## Terceiro lugar

- `POST /api/tournaments/:id/categories/:categoryId/bronze`: proprietário/gerente cria a disputa entre as perdedoras das semifinais. Não recebe corpo. Retorna 201 com o confronto.
- 409 se a disputa já existe ou não existem duas semifinais concluídas com placar; 404 para categoria inexistente/de outra arena; 403 para papel proibido.
- A disputa usa os mesmos endpoints de resultado e histórico das eliminatórias. `stage` distingue `bracket` e `bronze` nos confrontos.

## Desempates

- `POST /api/tournaments/:id/groups/:groupId/tiebreak`: gestores enviam `{ "teamIds": ["uuid", "uuid"], "expectedVersion": 3, "reason": "Critério aplicado conforme regulamento" }`. A lista contém todas as duplas do grupo na ordem desejada. Retorna 201 com a decisão.
- `GET` no mesmo endereço: últimas 50 decisões, incluindo substituídas e invalidadas, para equipe administrativa.
- `GET /api/tournaments/:id/draw` inclui decisões vigentes em `tiebreaks` e `standings_version` nos grupos.
- Corpo inválido: 400; papel sem permissão: 403; grupo de outra arena/inexistente: 404; jogos pendentes, ausência de empate, versão antiga, ordem que desrespeita critérios ou chave existente: 409.

## Eliminatórias

- `POST /api/tournaments/:id/bracket`: proprietário/gerente envia `{ "categoryId": "uuid", "qualifiers": 2 }`, com 1 ou 2 classificadas por grupo. Retorna 201 com quantidade de classificadas. Partidas pendentes, empate no corte, menos de duas classificadas ou chave existente retornam 409.
- `GET /api/tournaments/:id/draw` agora inclui `brackets` e `knockouts`.
- `GET /api/tournaments/:id/knockouts/:matchId/result`: últimas 50 alterações, para equipe administrativa.
- `PATCH` no mesmo endereço: mesmo corpo dos resultados dos grupos, para gestores. Recusa jogos aguardando adversário, avanços automáticos, versão antiga ou próxima partida já concluída. Propaga o vencedor na mesma transação.

## Resultados

- `PATCH /api/tournaments/:id/matches/:matchId/result`: gestores enviam `{ "scoreA": 6, "scoreB": 4, "expectedVersion": 0, "reason": "Placar conferido" }`. Para anular, enviar ambos os placares `null`. Retorna o confronto atualizado.
- Versão desatualizada, placar idêntico ou regra inválida no banco: 409. Corpo inválido: 400. Sem sessão: 401. Papel proibido: 403. Confronto fora do torneio/arena ou inexistente: 404.
- `GET` no mesmo endereço: últimas 50 alterações em ordem decrescente de versão; disponível à equipe administrativa, incluindo recepção.
- `GET /api/tournaments/:id/draw` inclui `score_a`, `score_b` e `result_version` nos confrontos.

- `GET /api/tournaments/:id/draw`: grupos, duplas e confrontos do torneio, para proprietário, gerente e recepção.
- `POST /api/tournaments/:id/draw`: `{ "categoryId": "uuid", "groupSize": 3 }`, exclusivo de proprietário/gerente. `groupSize` aceita 3 ou 4. Responde 201 com `groupCount`.
- 400: corpo inválido; 401: sem sessão; 403: papel sem permissão; 404: torneio/categoria não encontrado; 409: inscrições abertas, quantidade fora de 2–64 ou sorteio já realizado.
