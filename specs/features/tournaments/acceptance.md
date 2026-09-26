# Aceite

- Um gestor cria torneio com datas válidas e categorias permitidas, sem duplicatas.
- Só torneios abertos aceitam inscrições; fechamento e retirada disputam a mesma trava do torneio.
- Uma dupla contém dois clientes distintos, ativos e da arena.
- Um atleta não participa de duas duplas ativas na mesma categoria, inclusive com inscrições concorrentes.
- Retirada preserva histórico e libera os atletas para nova inscrição na categoria.
- Recepção pode inscrever e retirar, mas não cria torneios nem muda a situação de inscrições.
- Professor e outra arena não veem nem alteram torneios privados.

# Grupos e confrontos

## Exportação

- Os botões Classificação, Partidas e Pódio baixam arquivos CSV do torneio selecionado, com nomes das duplas e categorias.
- Classificação parcial, decisão manual, avanço sem adversário e colocação ainda indefinida devem ser identificados corretamente.
- Acentos, aspas, separadores e quebras de linha são preservados; textos com prefixos de fórmula são neutralizados; saldos negativos continuam numéricos.
- `tests/tournaments.reports.test.mjs` verifica serialização, classificação, partidas e pódio pendente.

## Terceiro lugar e pódio

- Criar bronze requer duas semifinais concluídas com placar; não permite duplicata, categoria só com final ou semifinal com avanço sem adversário.
- Perdedoras das semifinais disputam bronze; vencedora e perdedora da final ocupam primeiro e segundo lugares.
- Corrigir semifinal atualiza participantes pendentes; final ou bronze concluídos bloqueiam a correção. Anular remove colocação e preserva histórico.
- Recepção e outra arena não criam a disputa. Outra arena não consulta.
- `tests/tournament-podium.database.sql` cobre categorias com 2, 3 e 4 classificadas e o ciclo de correções/anulações. O teste de pódio em `tests/tournaments.results.test.mjs` confirma a separação entre final e bronze.

## Desempate manual

- Gestor ordena duplas empatadas e justifica; a classificação muda sem alterar estatísticas e a chave recebe as classificadas corretas.
- Reordenar duplas não empatadas, repetir duplas, decidir com jogos pendentes, usar versão antiga ou decidir após gerar chave deve falhar.
- Substituição preserva histórico. Corrigir um placar invalida a decisão; a nova decisão usa a nova versão do grupo.
- Recepção consulta e não decide; outra arena não consulta/decide; exclusão direta do histórico é negada.
- `tests/tournament-tiebreaks.database.sql` valida o fluxo com um líder isolado e três duplas empatadas, em uma transação revertida ao final.

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

## Paginação e busca

- Listar torneios em páginas de 20, buscar por nome e filtrar situação; eventos além do antigo limite de 100 continuam acessíveis.
- Selecionar um torneio fora da página atual deve retornar seus dados apenas se pertencer à arena autenticada.
- Carregar todas as duplas do torneio selecionado e os integrantes em lotes; inscrições de outros torneios não ocultam dados. Clientes inativos continuam identificados no histórico.
- Buscar atletas ativos em páginas de 20; os cadastros além dos primeiros mil devem ser acessíveis. Trocar torneio limpa a categoria e os atletas.
- Respostas atrasadas não devem substituir os detalhes de outra seleção. Uma falha não deve apresentar resultado parcial como completo.
- `tests/tournaments.pagination.test.mjs` cobre parâmetros inválidos, busca literal e carregamento de 1.105 registros em páginas menores que o limite solicitado, incluindo falha intermediária e cursor sem avanço.
