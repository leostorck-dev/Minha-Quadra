# CSV de recebimentos de mensalidades

OWNER e MANAGER podem exportar o histórico completo com os filtros atuais de assinatura, mês de recebimento e meio. O filtro do mês usa o fuso da arena e os mesmos limites da listagem. GET /api/memberships/payments/export exige sessão e retorna CSV privado sem cache.

Campos: pagamento, assinatura, cliente, plano, vencimento quitado, valor, meio e recebimento UTC. Inativos e assinaturas canceladas preservam os nomes atuais. O arquivo inclui todas as páginas, em ordem de recebimento. Busca por cursor de ID em lotes de 200; falhas interrompem sem baixar arquivo parcial. CSV com BOM, decimal brasileiro e proteção de fórmulas. Sem migração.

Testar cabeçalho vazio, centavos, data UTC, fórmulas e volume superior a mil pagamentos, além de build e regressão de histórico/RLS no banco.
