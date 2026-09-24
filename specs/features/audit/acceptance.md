# Aceitação — Auditoria

1. Criar e alterar cliente, reserva ou bloqueio gera um evento correto com o usuário autenticado.
2. Inativar cliente, cancelar reserva, fazer check-in, concluir reserva, registrar pagamento e estornar geram eventos próprios.
3. Os eventos somem com um `ROLLBACK` da operação original.
4. Contatos e observações de cliente não aparecem em `details`.
5. Recepção pode operar reservas e pagamentos, mas não ler a lista completa de auditoria. Proprietário e gerente leem apenas a própria arena.
6. Usuários autenticados não podem inserir, alterar ou apagar logs diretamente nem executar a função privada.
7. Listagem ordenada, filtrada e paginada funciona com dados vazios e com mais de uma página.
