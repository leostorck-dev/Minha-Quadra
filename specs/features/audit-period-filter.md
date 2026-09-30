# Período na auditoria

Proprietário e gerente podem filtrar os eventos por data inicial e final no fuso da arena. Qualquer limite pode ficar em branco. As datas são inclusivas: `from` representa o início do dia local e `to` o fim do dia local por limite exclusivo no início do dia seguinte. A conversão respeita mudanças de horário de verão.

## Contrato

- `GET /audit`, `GET /api/audit` e `GET /api/audit/export` aceitam `from` e `to` no formato `YYYY-MM-DD`.
- Datas impossíveis ou `from > to` retornam erro de validação na API. A página redireciona para o filtro padrão, como faz para tipos inválidos.
- Tipo, paginação e CSV preservam os limites de data. Alterar as datas no formulário volta à primeira página. O CSV sempre inclui todas as páginas do período.
- O servidor converte datas usando `tenants.timezone` da arena autenticada, aplica `.gte(created_at, início)` e `.lt(created_at, próximo dia)` e preserva o filtro `tenant_id` e a RLS.
- Sem migração ou alteração nas permissões.

## Aceitação

Testar datas inválidas, limites independentes, mesma data e transições de horário de verão; validar lista e CSV com filtros idênticos, lint, testes e build.
