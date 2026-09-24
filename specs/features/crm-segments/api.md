# API

`GET /api/customers` aceita `segment` além de `q`, `tag`, `status`
e `page`. Valores: `all`, `lapsed_15`, `lapsed_30`,
`frequent_10`, `birthday_month` e `new_30`. A resposta conserva
`items`, `total`, `page`, `pageSize` e adiciona
`reservationCount` e `lastReservationAt` a cada item.
