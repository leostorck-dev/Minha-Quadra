# API

- `GET /api/tournaments`: torneios, categorias, duplas, integrantes e clientes ativos da arena.
- `POST /api/tournaments`: `{name, startsOn, endsOn, categories}`. Proprietário ou gerente.
- `PATCH /api/tournaments/[id]`: `{status: "open" | "closed"}`. Proprietário ou gerente.
- `POST /api/tournaments/[id]/teams`: `{categoryId, customerIds: [id, id]}`. Proprietário, gerente ou recepção.
- `PATCH /api/tournaments/[id]/teams/[teamId]`: `{status: "withdrawn"}`. Proprietário, gerente ou recepção.

Respostas de erro seguem `{error: {code, message}}`. O navegador não envia `tenant_id`.
# Sorteio

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
