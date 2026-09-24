# Autenticação e cadastro da arena — MQ-014 a MQ-022

Status: implementação autorizada pelo pedido de avançar para as próximas etapas.

## Objetivo

Permitir que o proprietário crie uma conta, cadastre sua arena, entre e saia do painel. A identidade é verificada pelo Supabase Auth; o perfil define tenant e papel.

## Usuários

Proprietário de arena. Outros papéis serão convidados em tarefa futura, após uma spec própria de gestão de usuários.

## Regras

- Cadastro usa email e senha no Supabase Auth.
- Apenas usuário autenticado e ainda sem perfil pode criar uma arena.
- Criar tenant e perfil OWNER é uma transação atômica no banco.
- O usuário autenticado não envia um tenant existente para ganhar acesso.
- Login de usuário sem perfil leva ao cadastro da arena.
- O painel exige identidade verificada e perfil válido.
- Recuperação de senha envia um link sem revelar se o email existe. A troca da senha exige sessão criada pelo link.
- O proxy atualiza cookies de sessão; a autorização final é feita no servidor e por RLS.

## Modelo de dados

`tenants.owner_user_id` referencia `auth.users.id` e é único. `profiles.id` referencia o mesmo usuário. A função `onboard_arena` usa `SECURITY INVOKER` e políticas RLS para gravar as duas tabelas.

## Fluxo principal

1. Usuário cria conta.
2. Confirma email, se exigido pelo projeto Supabase.
3. Entra e informa nome da arena, slug e seu nome.
4. Banco cria tenant e perfil OWNER na mesma transação.
5. Usuário acessa o painel.

## Erros

- Email/senha inválidos: mensagem genérica.
- Slug já usado: solicitar outro.
- Usuário já vinculado a uma arena: não criar outra.
- Falha de conexão: manter formulário e permitir nova tentativa.

## Aceitação

- Usuário anônimo não cria arena.
- Usuário autenticado cria apenas a própria arena e recebe papel OWNER.
- Uma falha no perfil desfaz a criação do tenant.
- Login, logout e redirecionamento funcionam com cookies de sessão.
- Usuário sem perfil não vê dados privados do painel.

## Fora de escopo

Convites de funcionários, múltiplos tenants por usuário e plano de assinatura.
