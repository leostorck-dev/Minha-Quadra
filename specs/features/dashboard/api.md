# API — Painel gerencial

`GET /api/dashboard` retorna `{ today, timezone, bookingsToday, activeCustomers, occupancyPercent, upcoming, financial }`.

`upcoming` contém `id`, `courtName`, `customerName`, `startAt` e `status`. `financial` é `null` para RECEPTIONIST e COACH; para OWNER e MANAGER, contém `todayIncome`, `monthIncome`, `averageTicket` e `revenueSeries` com seis meses.

A resposta é privada e sem cache. Sem sessão, retorna 401; papel fora da equipe administrativa retorna 403. Outros erros seguem `{ error: { code, message } }`.
