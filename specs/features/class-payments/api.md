# API

`GET /api/classes/[id]/payment` retorna valor, situação e pagamento da aula para proprietário, gerente e recepção.

`POST /api/classes/[id]/payment` recebe `{ "method": "PIX" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD" }` e registra o valor integral da aula, sem aceitar valor ou arena do cliente.

`PATCH /api/classes/[id]/payment` recebe `{ "status": "refunded" }` e registra um estorno.

Erros seguem `{ "error": { "code", "message" } }`.
