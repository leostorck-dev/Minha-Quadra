# Dados — Painel gerencial

Não há tabela nova. A função `dashboard_overview()` consulta `tenants`, `profiles`, `customers`, `courts`, `reservations`, `payments` e `financial_transactions` com `SECURITY INVOKER`.

O perfil autenticado determina o tenant e o papel. Os dados financeiros só são agregados para OWNER ou MANAGER; RLS continua limitando cada tabela. A função retorna JSON com métricas operacionais, até cinco reservas futuras e, quando permitido, métricas financeiras e série mensal.
