-- Senha temporária no cadastro de usuário — EPI-335.
--
-- Pedido do Victor (01/11/2026): ao cadastrar usuário, ter a opção de
-- SENHA TEMPORÁRIA (o administrador define e passa para a pessoa),
-- mantendo o e-mail com aviso para trocar a senha.
--
-- A Edge Function convidar-usuario cria a conta com a senha temporária e
-- liga usuarios.trocar_senha = true. Enquanto estiver true, o sistema só
-- deixa a pessoa usar a tela "Defina sua senha". Ao criar a senha dela,
-- a tela chama marcar_senha_trocada(), que desliga o aviso.
--
-- Teste: tests/banco/teste_senha_temporaria.sql (antes: 3x FALHOU; depois: 3x OK).

alter table usuarios add column trocar_senha boolean not null default false;

-- Desliga a troca obrigatória do PRÓPRIO usuário logado (auth.uid()).
-- SECURITY DEFINER: o usuário comum não pode editar a tabela usuarios
-- (só o administrador), então a função faz só esta mudança, só nele.
create function marcar_senha_trocada()
returns void
language sql security definer set search_path = public as $$
  update usuarios set trocar_senha = false where id = auth.uid();
$$;

revoke execute on function marcar_senha_trocada() from public, anon;
grant execute on function marcar_senha_trocada() to authenticated;
