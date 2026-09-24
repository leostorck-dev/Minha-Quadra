# Papéis e permissões iniciais

| Papel        | Escopo planejado                                       |
| ------------ | ------------------------------------------------------ |
| OWNER        | Configuração da arena, usuários, operação e relatórios |
| MANAGER      | Operação e relatórios                                  |
| RECEPTIONIST | Agenda, clientes, reservas e pagamentos                |
| COACH        | Próprias aulas e agenda                                |

Nesta etapa, o banco libera somente a leitura do próprio perfil e tenant. As permissões específicas por módulo serão adicionadas com a spec de cada feature, antes de conceder operações de escrita. `CUSTOMER` permanece fora do painel administrativo inicial.
