# Banco

`staff_invites` guarda arena, email normalizado, papel, token UUID, estado,
criador, prazo e aceite. Existe no máximo um convite pendente por email e
arena. RLS mostra convites ao proprietário da arena e ao destinatário com
email confirmado. Só proprietário cria ou revoga.

`private.complete_staff_invite` valida sessão, email confirmado, token,
prazo e ausência de perfil, bloqueia a linha e cria o perfil na mesma
transação. `public.join_arena` expõe apenas essa operação autenticada.
Proprietário pode ler e excluir perfis não proprietários da própria arena e
alterar apenas o nome da arena.
