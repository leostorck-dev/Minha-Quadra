# API

`GET /api/classes/[id]/commission` retorna comissão calculada, elegibilidade e liquidação existente para gestor ou professor da aula.

`POST /api/classes/[id]/commission` recebe `{ "method": "pix" | "cash" | "transfer" }` e registra a liquidação. Somente proprietário e gerente podem chamar. Valor, arena e professor não são aceitos do navegador.

Erros seguem `{ "error": { "code", "message" } }`.
