# Exportação da auditoria

Proprietário e gerente podem baixar todos os eventos de auditoria da própria arena em CSV, respeitando o filtro de tipo exibido na tela. A página continua paginada em 25 itens; o arquivo percorre todos os registros por ID em lotes de 200 e ordena por instante, mais recente primeiro. Qualquer falha de lote interrompe a geração, sem arquivo parcial.

## Contrato

`GET /api/audit/export?type=all|customer|reservation|payment` requer papel OWNER ou MANAGER e tenant da sessão. `page` não limita a exportação. Tipo inválido devolve erro de validação. A resposta usa UTF-8 com BOM, CSV com separador ponto e vírgula, `private, no-store`, `nosniff` e anexo `auditoria.csv`.

Colunas: ID do evento, Data e hora (UTC), Evento (código), Tipo da entidade, ID da entidade, Usuário, ID do usuário. O JSON `details` fica fora do arquivo para não divulgar dados livres ou futuros campos sensíveis. Valores de texto recebem escape de CSV e proteção contra fórmulas. Não há mudança no banco.

## Aceitação

Testar cabeçalho vazio, mais de mil eventos, ordenação no mesmo segundo, escape de texto e filtro de tipo. Confirmar autorização de proprietário/gerente e bloqueio anônimo. Rodar testes, lint, build e conferir deploy.
