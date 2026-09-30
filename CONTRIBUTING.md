# Contribuindo com o Minha Quadra

## Fluxo de trabalho

1. Atualize a branch principal antes de começar.
2. Crie uma branch curta e descritiva. Exemplos: `feat/reserva-publica`, `fix/conflito-agenda` ou `chore/ci`.
3. Mantenha mudanças de produto, banco e infraestrutura separadas quando isso facilitar a revisão.
4. Execute `npm run check` e `npm run build` antes de abrir o pull request.
5. Abra um pull request e descreva comportamento, risco, evidências e plano de reversão.

Não envie `.env`, tokens, senhas, chaves de serviço ou dados reais de clientes ao Git.

## Alterações no banco

- Toda mudança estrutural deve entrar como uma nova migration em `supabase/migrations`.
- Não edite uma migration que já tenha sido aplicada em ambiente compartilhado.
- Use nomes com timestamp e objetivo explícito.
- Preserve isolamento por `tenant_id`, RLS e validações no banco.
- Teste migrations em um projeto de desenvolvimento antes do projeto original.
- Registre no pull request como aplicar e como reverter ou compensar a mudança.
- Gere novamente `src/types/database.ts` quando o schema mudar; o arquivo é gerado e não deve ser formatado manualmente.

## Critérios mínimos de revisão

- autorização verificada no servidor, não apenas na interface;
- nenhum dado de outra arena pode ser consultado ou alterado;
- valores monetários mantêm precisão em centavos;
- datas respeitam o fuso da arena;
- mutações possuem feedback de sucesso e erro;
- mobile, teclado e estados vazios foram considerados;
- novas variáveis estão documentadas em `.env.example`;
- textos públicos não prometem funcionalidades inexistentes.

## Publicação

Merge, migration e deploy são etapas separadas. Um pull request aprovado não autoriza automaticamente aplicar migrations ou publicar em produção. Depois da publicação, verifique a URL real, autenticação, fluxo alterado e logs.
