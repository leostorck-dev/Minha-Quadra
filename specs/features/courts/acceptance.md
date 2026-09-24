# Aceitação — Quadras

1. Proprietário e gerente conseguem cadastrar e editar quadras, horários e preço padrão.
2. Recepção e professor conseguem consultar, sem controles de edição.
3. Uma quadra pode passar entre disponível, manutenção e inativa sem perder seu cadastro.
4. A API rejeita valores monetários com mais de duas casas. A API e o banco rejeitam preço negativo, horários inválidos e abertura após fechamento; o banco armazena preço com duas casas.
5. Um usuário não consegue ler ou alterar quadras de outra arena, mesmo chamando a Data API diretamente.
6. A API não permite exclusão física; `DELETE` inativa.
7. Testes automatizados cobrem validação de preço, horário, payload e filtro.
