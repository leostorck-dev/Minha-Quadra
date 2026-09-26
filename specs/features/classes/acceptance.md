# Aceite

- Cadastro de professor e regra de comissão válidos.
- Aula de 1 a 12 alunos, respeitando tipo, disponibilidade e funcionamento da quadra.
- Aulas não podem sobrepor reservas ou outras aulas.
- Alunos de outra arena e professores inativos são rejeitados.
- Cancelar aula libera o bloqueio da quadra e preserva histórico.
- Conclusão registra presença de cada aluno e comissão baseada na regra congelada.
- Papéis sem permissão não podem ver nem alterar aulas de outra arena.

## Histórico e volume de alunos

- Navegar em páginas de 25 aulas, incluindo cadastros além do antigo limite de 500, e filtrar por situação/professor no servidor.
- Uma página de 25 turmas de 12 alunos deve retornar os 300 participantes completos, mesmo com mais de mil inscrições no histórico.
- Alunos além dos primeiros 500 clientes devem aparecer no agendamento e manter seu nome no histórico.
- Indicadores deixam explícito que correspondem à página; troca de filtro não permite agir sobre resultados antigos durante carregamento.
- Teste transacional `tests/classes.database.sql` cria 90 turmas de 12 alunos, valida uma segunda página com 300 participantes, acesso do professor e isolamento entre arenas; ao final reverte toda a massa. A validação de parâmetros está em `tests/classes.validation.test.mjs`.
