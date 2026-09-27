# Recuperação do formulário de reservas

## Objetivo e aceitação

- Diferenciar carregamento, falha e resultado vazio nas consultas de clientes e horários.
- Vincular resultados aos filtros atuais e descartar respostas canceladas.
- Permitir repetir GET sem perder os dados preenchidos.
- Impedir salvar durante consultas pendentes ou com erro; bloqueios não dependem da busca de clientes.
- Impedir envios simultâneos com trava síncrona; desabilitar campos e fechamento durante a gravação.
- Sucesso HTTP não depende de interpretar JSON desnecessário.

Sem alterações de API, banco ou permissões. Conflitos e autorização continuam validados no servidor. A trava de interface não garante idempotência de rede.

Verificar lint, build, testes existentes de reservas e recuperação de consultas na interface quando houver sessão disponível.
