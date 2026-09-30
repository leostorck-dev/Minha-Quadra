# Histórico de reservas do cliente

Na ficha de cada cliente, OWNER, MANAGER e RECEPTIONIST podem consultar reservas da arena em páginas de 25, da mais recente para a mais antiga. A lista inclui data e horário no fuso da arena, quadra, situação da reserva, valor e situação da cobrança. Bloqueios não entram. Reservas canceladas, concluídas e com falta permanecem no histórico. Não há migração.

## API e isolamento

`GET /api/customers/:id/reservations?page=1` exige os papéis de clientes, valida página e confirma que o cliente pertence à arena autenticada. A consulta limita `tenant_id` e `customer_id`, ordena por `start_at DESC, id DESC`, usa 25 registros e total exato. Pagamentos da página são consultados em lote com o mesmo tenant. RLS continua aplicada às duas tabelas. Resposta privada sem cache. Cliente de outra arena ou inexistente recebe 404.

## Aceitação

- Exibir estado vazio, carregamento, erro com nova tentativa e paginação sem perder a ficha do cliente.
- Distinguir cobranças pendentes, pagas, estornadas, canceladas e sem cobrança conforme a lógica da agenda.
- Não mostrar eventos de bloqueio. Testar página inválida, estado de cobrança, mais de uma página e sessão anônima.
- Executar lint, build e testes, e verificar deploy nos dois sites.
