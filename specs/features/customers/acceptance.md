# Aceitação — Clientes

- Dado um usuário OWNER de uma arena, quando cadastra um cliente válido, então vê o novo registro na listagem.
- Dado um usuário sem sessão, quando solicita a API de clientes, então recebe 401.
- Dado um usuário COACH, quando solicita a API de clientes, então recebe 403.
- Dado um cliente de outra arena, quando tenta ler ou alterar seu ID, então recebe 404.
- Dado um payload com `tenant_id`, quando tenta criar um cliente, então recebe 400.
- Dado um cliente ativo, quando é inativado, então permanece no banco com status `inactive`.
