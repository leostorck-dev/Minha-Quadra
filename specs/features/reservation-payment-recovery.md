# Recuperação da cobrança de reservas

Pagamento ou estorno confirmado deve manter a confirmação quando falhar a leitura posterior. Exibir sucesso, aviso de dados desatualizados e Atualizar dados, que executa apenas GET. Bloquear gravações até leitura bem-sucedida; impedir cliques repetidos durante envio e fechamento durante solicitação em andamento. Erro inicial ao carregar também oferece tentativa de leitura. Avisar a agenda assim que a gravação for confirmada.

Reutilizar saveAndRefresh. Sem mudanças de API, permissões ou banco. Validar pagamento e estorno confirmados com erro de leitura e recuperação sem reenvio, typecheck, lint e build.
