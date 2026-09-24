# Dados e segurança

`coaches` guarda cadastro e regra de comissão. `class_sessions` guarda tipo, professor, quadra, reserva de bloqueio, preço e cópia da comissão. `class_students` guarda participantes e presença. O bloqueio de `reservations` mantém a mesma regra de horários e impedimento de sobreposição. Funções transacionais criam e cancelam aula e marcam presença. RLS de leitura restringe as linhas à própria arena; mutações exigem OWNER/MANAGER/RECEPTIONIST, conclusão também é permitida ao COACH vinculado à aula quando um perfil estiver associado.
