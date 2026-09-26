# Aceite

- Criar e desativar plano, impedindo novas adesões ao inativo.
- Cliente recebe no máximo uma assinatura ativa.
- Preço e franquia existentes não mudam quando o plano muda.
- Quitação avança exatamente um mês e cria uma única receita.
- Dupla submissão concorrente não quita o mesmo vencimento duas vezes.
- Histórico permanece após cancelamento.
- Dados e operações de outra arena ou papel não autorizado são bloqueados.

## Crescimento e histórico

- Clientes após os primeiros 500 cadastros continuam disponíveis na adesão e podem ser encontrados pelo nome.
- Inativar cliente não substitui seu nome por uma descrição genérica no histórico e não permite nova adesão.
- Planos e assinaturas são lidos em lotes com cursor; consumo é consultado por lotes de identificadores sem corte global. Falha em qualquer lote deve abortar a resposta completa.
- `tests/memberships.database.sql` confirma histórico após inativação, bloqueio de nova adesão e criação/consumo para o cliente 501, além das verificações de pagamento e isolamento entre arenas. Toda a massa é revertida.

- Uma mutação confirmada continua indicada como concluída quando apenas a atualização da tela falha. Novas alterações ficam bloqueadas até recarregar com sucesso, e os formulários salvos são limpos normalmente. Falha de leitura inicial também oferece recuperação. `tests/memberships.mutations.test.mjs` cobre a separação entre falha de gravação e falha de atualização.

## Histórico paginado

- Acessar pagamentos além dos primeiros 50 e filtrar uma assinatura sem misturar registros de outras assinaturas ou arenas.
- Distinguir o vencimento quitado da data em que o recebimento foi registrado, exibida no fuso da arena.
- Preservar identificação de cliente inativo e assinatura cancelada.
- Troca de filtro reinicia a paginação; respostas atrasadas não substituem a consulta atual; falhas oferecem nova tentativa.

- O teste transacional cria 55 quitações, valida os cinco registros da terceira página, preservação após cancelamento e invisibilidade em outra arena. Toda a massa é revertida ao final.
