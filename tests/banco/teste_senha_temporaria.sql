-- =============================================================
-- TESTE DA SENHA TEMPORÁRIA — EPI360 (EPI-335)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 22: todos FALHOU.
-- Esperado DEPOIS da correção 22: todos OK.
-- =============================================================
do $$
declare
  v_admin     uuid;
  v_empresa   uuid;
  v_outro     uuid := gen_random_uuid();
  v_flag      boolean;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_admin, v_empresa from usuarios order by created_at limit 1;
  if v_admin is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_admin;

  insert into auth.users (id, email) values (v_outro, 'temp-' || left(v_outro::text, 8) || '@teste.local');

  -- TESTE 1: usuário novo começa SEM troca obrigatória (convite) -----
  begin
    insert into usuarios (id, empresa_id, nome_completo, email, perfil)
      values (v_outro, v_empresa, 'Usuário senha temporária', 'temp-' || left(v_outro::text, 8) || '@teste.local', 'gestor');
    execute 'select trocar_senha from usuarios where id = $1' into v_flag using v_outro;
    v_resultado := case when v_flag = false then 'OK - começa sem troca obrigatória' else 'FALHOU - ' || coalesce(v_flag::text, 'vazio') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (padrão sem troca): ' || v_resultado;

  -- (a Edge Function, com senha temporária, liga a troca obrigatória)
  begin
    execute 'update usuarios set trocar_senha = true where id = $1' using v_outro;
  exception when others then null;
  end;

  -- TESTE 2: o próprio usuário marca a senha como trocada ------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute 'select marcar_senha_trocada()';
    execute 'select trocar_senha from usuarios where id = $1' into v_flag using v_outro;
    v_resultado := case when v_flag = false then 'OK - troca registrada' else 'FALHOU - continua pedindo troca' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (usuário registra a troca): ' || v_resultado;

  -- TESTE 3: a função só mexe no PRÓPRIO usuário ----------------------
  execute 'reset role';
  begin
    execute 'update usuarios set trocar_senha = true where id = $1' using v_admin;
  exception when others then null;
  end;
  execute 'set local role authenticated';
  begin
    execute 'select marcar_senha_trocada()';
    execute 'reset role';
    execute 'select trocar_senha from usuarios where id = $1' into v_flag using v_admin;
    v_resultado := case when v_flag = true then 'OK - não mexeu no admin' else 'FALHOU - mexeu em outro usuário' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (só o próprio usuário): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
