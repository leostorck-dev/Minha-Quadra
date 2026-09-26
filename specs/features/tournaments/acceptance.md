# Aceite

- Um gestor cria torneio com datas válidas e categorias permitidas, sem duplicatas.
- Só torneios abertos aceitam inscrições; fechamento e retirada disputam a mesma trava do torneio.
- Uma dupla contém dois clientes distintos, ativos e da arena.
- Um atleta não participa de duas duplas ativas na mesma categoria, inclusive com inscrições concorrentes.
- Retirada preserva histórico e libera os atletas para nova inscrição na categoria.
- Recepção pode inscrever e retirar, mas não cria torneios nem muda a situação de inscrições.
- Professor e outra arena não veem nem alteram torneios privados.
# Grupos e confrontos

## Eliminatórias

- Gestor classifica 1 ou 2 duplas por grupo após concluir os resultados e gera chave única.
- Categoria de 6, 9 e 64 duplas é coberta no teste transacional: 4, 3 e 44 classificadas, respectivamente; chaves completas, sem duplas repetidas, com avanços automáticos corretos.
- Todos os resultados levam a um campeão. Correção antes da próxima rodada propaga vencedor. Resultado posterior impede alteração do anterior. Anular a final remove a indicação de campeão.
- Empate circular completo impede gerar chave tanto para 1 quanto para 2 vagas. Resultados de grupos ficam bloqueados após geração.
- Recepção consulta mas não altera; outra arena não acessa; histórico não pode ser apagado pelo usuário.
- `tests/tournament-knockouts.database.sql` executa tudo em uma transação com rollback.

## Resultados

- Gestor lança, corrige e anula um resultado com justificativa; a classificação é recalculada e o histórico é preservado.
- Placar negativo, acima de 99, fracionário, empate, apenas um lado nulo e versão desatualizada são recusados.
- Recepção consulta mas não altera; outras arenas não leem nem alteram; escrita direta e exclusão do histórico são negadas.
- `tests/tournaments.results.test.mjs` verifica validação, partidas pendentes, correção/anulação, saldo, pontos marcados e empate completo.
- `tests/tournament-results.database.sql` verifica RPC, histórico, versão antiga, anulação e permissões numa transação com rollback.

- Gestor encerra as inscrições, escolhe a categoria e tamanho máximo, confirma e visualiza o sorteio persistido.
- Duplas retiradas não participam; todas as inscritas entram exatamente uma vez.
- Grupos equilibrados, de 2 até o máximo escolhido; cada par joga uma vez dentro do grupo.
- Repetir o sorteio e reabrir inscrições após sortear devem falhar, inclusive por chamada direta à API/RPC.
- Recepção consulta, professor não acessa e outra arena não consulta nem modifica.
- Teste transacional `tests/tournament-draws.database.sql`: 2, 3, 4, 5, 7, 8 e 64 duplas, tamanhos 3/4, retirada, repetição, reabertura, RLS e grants. Toda a massa é revertida com `ROLLBACK`.
