# Exportação da agenda

Permitir a OWNER, MANAGER e RECEPTIONIST exportar CSV da agenda com os mesmos filtros de período, quadra e situação da tela. O período permanece limitado a oito dias pela validação existente.

O arquivo inclui identificação, quadra, cliente, tipo, início e fim no fuso da arena, fuso, situação, valor e cobrança. Bloqueios não possuem cobrança. CSV UTF-8 com BOM, separador ponto e vírgula e proteção contra fórmulas. Endpoint autenticado, isolamento por arena e cache privado desativado.

A consulta compartilhada da agenda percorre reservas por ID em lotes de 200 e consulta pagamentos em grupos de 100 IDs. A apresentação permanece ordenada por início. Falhas em qualquer lote interrompem a leitura, evitando relatórios parciais silenciosos.

Validar conversão de fuso, situações de cobrança, escape CSV, resultado vazio e mais de mil linhas; executar testes, lint e build. Sem migração de banco.
