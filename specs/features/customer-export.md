# Exportação de clientes

Os mesmos papéis da listagem (OWNER, MANAGER e RECEPTIONIST) podem baixar CSV de todos os clientes que correspondem aos filtros aplicados de nome, status, etiqueta e segmento. A arena vem da sessão e o RLS continua aplicado. GET /api/customers/export usa a validação existente e ignora paginação da tela.

Campos: identificador, nome, telefone, email, nascimento, status, etiquetas, quantidade de reservas e última reserva em UTC. Observações internas não são necessárias ao relatório. CSV UTF-8/BOM com escape e proteção de fórmulas. Sem resultados: cabeçalho válido. Erro em qualquer lote: nenhuma exportação parcial. Consulta por cursor de ID em lotes de 200; filtros compartilhados com a listagem.

Validar formatação, campos opcionais, fórmulas, mais de mil registros, regressões dos segmentos e isolamento entre arenas. Sem migração.
