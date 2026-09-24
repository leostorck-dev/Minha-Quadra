# Aceitação — Pagamentos

- Uma reserva sem recebimento mostra valor e situação pendente na agenda.
- Registrar Pix, dinheiro, crédito ou débito muda a situação para paga e identifica o operador no histórico.
- Duas tentativas de pagamento da mesma reserva não criam cobrança duplicada.
- Bloqueios e reservas canceladas sem pagamento não aceitam recebimento.
- Estornar uma cobrança paga mantém o recebimento e acrescenta evento de estorno; segundo estorno é recusado.
- Um pagamento de outra arena não pode ser lido ou alterado, mesmo com UUID conhecido.
- O preço e a programação da reserva ficam protegidos após o recebimento.
- Lint, typecheck, testes relevantes e build de produção passam.
