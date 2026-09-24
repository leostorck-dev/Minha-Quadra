# Banco

`customers.tags text[]` começa vazio e usa índice GIN para filtro por
contenção. Cada etiqueta é minúscula, sem espaços nas bordas, única no
cliente e tem 2–30 caracteres; no máximo dez etiquetas. A checagem no banco
vale também para acesso direto à API de dados. RLS e `tenant_id` são os da
tabela de clientes. Alterações nas etiquetas geram evento de auditoria sem
registrar dados de contato.
