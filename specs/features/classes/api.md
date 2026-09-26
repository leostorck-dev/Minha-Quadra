# API

- `GET /api/classes?page=1&status=all&coachId=uuid`: professores, aulas paginadas, alunos, quadras e participantes, mais `count`, `page` e `pageSize` (25). `coachId` é opcional; situação aceita `all`, `scheduled`, `completed`, `cancelled`. Página deve ser inteira entre 1 e 10.000. Ordenação por cadastro decrescente, com identificador como desempate. Filtros aplicados antes da paginação; parâmetros inválidos retornam 400. Participantes, reservas, pagamentos e comissões pertencem apenas às aulas da página e à arena autenticada.
- `POST /api/classes/coaches`: cadastra professor.
- `PATCH /api/classes/coaches/[id]`: ativa ou desativa professor.
- `POST /api/classes`: agenda aula e bloqueia quadra.
- `PATCH /api/classes/[id]`: conclui com presença ou cancela.
