# Professores e aulas

Gestores cadastram professores com contato, especialidades e regra de comissão. A agenda de aulas usa as quadras existentes e bloqueia o horário no calendário de reservas. Cada aula tem tipo, professor, quadra, horário, valor e alunos. A equipe pode concluir a aula e marcar presença por aluno ou cancelar a aula. A página mostra agenda do professor, alunos atendidos, valor de aulas concluídas e comissão estimada.

O valor da aula representa a sessão inteira. Uma cobrança avulsa pode ser registrada manualmente e entra no financeiro, enquanto mensalidades são receitas separadas. Presenças em aulas concluídas alimentam o consumo da franquia do plano.

A comissão é calculada pela regra congelada na aula concluída. Proprietário e gerente podem registrar uma liquidação por aula, com despesa correspondente no financeiro.

## Histórico paginado e chamada completa

A agenda e o histórico apresentam 25 aulas por página, dos cadastros mais recentes aos antigos, com filtros de situação e professor. Os indicadores correspondem à página selecionada. Os filtros são aplicados no servidor antes da paginação e continuam sujeitos às permissões de cada perfil.

Alunos, horários, pagamentos e comissões são consultados apenas para as aulas da página. Como cada aula tem até 12 alunos, uma página pode conter até 300 vínculos, sem depender do antigo limite global de mil. Os nomes de clientes são carregados em lotes, preservando alunos além dos primeiros 500 cadastros e clientes inativos do histórico. Trocas de filtro ignoram respostas atrasadas; falhas permitem tentar novamente.
