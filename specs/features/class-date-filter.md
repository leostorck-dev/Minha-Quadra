# Aulas por data

O módulo Professores e aulas permite filtrar pelo dia de início da aula, combinando situação e professor. Sem data, mantém todo o histórico e a ordenação atual de cadastros recentes. Atalhos Hoje e Todas as datas. Trocar data volta à página um.

GET /api/classes aceita date=AAAA-MM-DD opcional. Rejeitar datas inexistentes. Converter meia-noite local e início do dia seguinte para UTC usando o fuso da arena; filtrar início inclusivo e fim exclusivo no horário da reserva vinculada. Paginação, contagem e dados dos alunos usam o mesmo conjunto filtrado. RLS e permissões existentes preservadas. Sem migração.

Testes: data válida/inválida, virada UTC, duração variável no horário de verão, regressão de aulas e isolamento no banco.
