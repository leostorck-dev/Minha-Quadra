# Filtros do histórico de mensalidades

OWNER e MANAGER podem combinar assinatura, mês de recebimento e forma de pagamento. Por padrão, todos os meses e meios. O mês considera paid_at no fuso da arena: início inclusivo e início do mês seguinte exclusivo. O vencimento quitado continua visível e não determina o filtro. Assinaturas canceladas preservam histórico.

GET /api/memberships/payments aceita month=AAAA-MM opcional e method=all|pix|cash|card|transfer. Rejeitar meses e métodos inválidos. Ao mudar filtros, voltar à primeira página. Limpar restaura todos os filtros. Mesmas permissões e isolamento; sem migração.

Testes: validação, virada de ano, fronteira UTC/fuso e regressão do histórico.
