# Banco — Financeiro básico

`financial_transactions`: `id`, `tenant_id`, `type`, `category`, `description`, `amount numeric(10,2)`, `status` (`pending`, `paid`, `cancelled`), `due_date`, `paid_at`, `activity_on`, `source_type` (`manual`, `reservation`, `refund`), `source_id`, `created_by`, `updated_by`, `created_at`, `updated_at`.

`activity_on` é a data local da arena usada para filtro mensal. Em pendentes, usa `due_date` quando informada; em pagos, a data local de `paid_at`. `(source_type, source_id)` é único para impedir duplicação da receita ou estorno de uma reserva. `source_id` é nulo apenas para lançamento manual.

Gatilhos validam transições e preservam a origem. Outro gatilho cria receitas e despesas a partir de `payments`, incluindo pagamentos existentes. RLS e permissões de colunas limitam os lançamentos manuais a proprietário e gerente da arena. A função de resumo usa os mesmos dados e a identidade autenticada. Não há `DELETE` para usuários.
