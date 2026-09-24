# Clientes — MQ-029 a MQ-041

Status: implementação autorizada pelo pedido de continuar as próximas etapas do roteiro.

## Objetivo e problema

Dar à recepção e à gestão uma lista confiável de clientes da própria arena para cadastro e consulta antes de criar reservas.

## Usuários e histórias

- Como recepcionista, quero cadastrar um cliente rapidamente para associá-lo a uma reserva.
- Como gerente, quero localizar e atualizar contatos sem acessar clientes de outra arena.
- Como proprietário, quero inativar registros que não devem mais aparecer na operação diária.

## Regras de negócio

- Nome obrigatório, entre 2 e 120 caracteres.
- Pelo menos um contato: telefone ou email.
- Telefone, quando informado, tem 8 a 20 caracteres; email, no máximo 254 e formato válido.
- Status `active` ou `inactive`; a operação de exclusão desta etapa apenas inativa.
- `tenant_id` e `created_by` são derivados da sessão no servidor e não aceitos do cliente.
- Proprietário, gerente e recepção podem listar, criar e editar. Professor não acessa o módulo.
- Lista paginada, ordenada por criação mais recente; busca inicial por nome.

## Fluxo principal

1. Usuário autorizado abre Clientes.
2. Consulta lista ou busca por nome.
3. Clica em Novo cliente, preenche nome e contato.
4. Servidor valida, identifica tenant, grava o cliente.
5. Cliente aparece na lista e tem página de detalhes para edição e inativação.

## Modelo de dados

Tabela `customers`: `id`, `tenant_id`, `name`, `phone`, `email`, `birth_date`, `notes`, `status`, `created_by`, `created_at`, `updated_at`. UUIDs; datas com fuso para timestamps. Índice por tenant e criação. Chave única `(tenant_id,id)` para referências compostas de módulos futuros.

## API

- `GET /api/customers?q=&page=&status=`: lista paginada de 20 itens e total, com filtro de ativos por padrão.
- `POST /api/customers`: cria; retorna 201 e cliente.
- `GET /api/customers/:id`: detalhe do tenant atual.
- `PATCH /api/customers/:id`: atualiza campos editáveis.
- `DELETE /api/customers/:id`: inativa; retorna 204.

Erros seguem `{ "error": { "code": "...", "message": "..." } }`.

## Permissões e isolamento

Todas as consultas e mutações filtram `tenant_id` derivado de `profiles` após `getClaims()`. RLS exige o mesmo tenant e papel autorizado. INSERT exige `created_by = auth.uid()`. Colunas `tenant_id` e `created_by` não recebem permissão de UPDATE do papel `authenticated`.

## Eventos e auditoria

`customer.created`, `customer.updated` e `customer.deactivated` são eventos conceituais nesta etapa. Persistência de `audit_logs` será implementada na etapa MQ-098 a MQ-102; `created_by` já registra quem criou.

## Casos de erro

- Sem sessão: 401.
- Papel COACH: 403.
- Payload inválido: 400.
- Cliente inexistente ou de outro tenant: 404.
- Falha de banco: 500 sem expor detalhes internos.

## Critérios de aceitação

1. Cliente criado aparece na lista da arena.
2. Cliente de outra arena nunca é listado nem editado.
3. POST ignora qualquer `tenant_id` ou `created_by` enviado pelo cliente.
4. Edição não altera tenant nem criador.
5. Inativação retira o cliente do filtro de ativos e preserva histórico.
6. Busca por nome e paginação funcionam em desktop e celular.

## Testes

Validar payloads aceitos e rejeitados, respostas 401/403/404, e isolamento de tenant no banco. Lint, TypeScript e build devem passar.

## Fora de escopo

Tags, segmentação, exclusão LGPD, importação em massa e integração com reservas.
