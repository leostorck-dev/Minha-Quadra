# Auditoria — MQ-098 a MQ-102

## Objetivo

Registrar um histórico confiável de criação, alteração e cancelamento de reservas, pagamentos e clientes, com usuário responsável e arena.

## Regras

- Triggers gravam os eventos na mesma transação da alteração. Se a gravação do log falhar, a operação também falha.
- O usuário vem da sessão autenticada (`auth.uid()`), validado contra o perfil da própria arena. O navegador não envia o ator nem o tenant do log.
- O log é somente leitura para proprietário e gerente da arena. Recepção e professor não recebem acesso à lista. Nenhum papel pode inserir, atualizar ou apagar logs pela API.
- Cliente: registrar criação, mudança e inativação. O log guarda nomes dos campos alterados e situação anterior/nova, sem telefone, email, observações ou valores antigos.
- Reserva e bloqueio: registrar criação, alteração, check-in, conclusão, cancelamento e ausência, com campos operacionais selecionados. Observações livres não são copiadas.
- Pagamento: registrar recebimento e estorno, com método, valor e reserva vinculada.
- O histórico começa na implantação desta etapa. Dados anteriores não recebem eventos artificiais.

Veja [database.md](./database.md), [api.md](./api.md) e [acceptance.md](./acceptance.md).
