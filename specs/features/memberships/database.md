# Dados e segurança

`membership_plans`: tenant, nome, preço, aulas por mês opcional, ativo.

`customer_memberships`: tenant, cliente, plano, preço e limite capturados, dia e próximo vencimento, status.

`membership_payments`: assinatura, tenant, competência/vencimento, valor, meio, data e responsável. Exclusivo por assinatura e competência.

RLS de leitura para OWNER/MANAGER da arena. Mutações passam por funções de banco que verificam papel e arena, serializam quitação e derivam valores do registro confiável. A receita é criada na mesma transação da quitação.
