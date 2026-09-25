# Dados e segurança

Visão `membership_class_usage` com `security_invoker = true`, baseada em assinaturas, presença, aulas e horário da reserva convertido para o fuso da arena. A leitura herda as políticas RLS das tabelas, ficando limitada a OWNER/MANAGER da própria arena. Índices existentes cobrem aluno da aula e chaves de associação.
