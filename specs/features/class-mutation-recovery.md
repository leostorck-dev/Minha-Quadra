# Recuperação após salvar aulas e pagamentos

Uma mutação confirmada continua sendo sucesso se a consulta seguinte falhar. Aplicar aos cadastros e ações de aulas/professores, pagamento/estorno de aula e liquidação de comissão. Confirmar sucesso e pedir atualização da tela sem reenviar a mutação. Bloquear novas alterações com dados desatualizados e oferecer tentativa somente de leitura. Guardar envio em andamento contra cliques repetidos. Reutilizar a separação já aplicada a mensalidades.

Sem mudança de API ou banco. Testar ordem salvar/ler, leitura falha após sucesso, falha na gravação sem leitura e tentativa de recuperação sem repetir gravação. Build e lint dos arquivos alterados.
