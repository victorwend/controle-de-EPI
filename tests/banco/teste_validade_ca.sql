-- =============================================================
-- TESTE: VALIDADE DO CA OPCIONAL — EPI360 (EPI-324)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 12: teste 1 FALHOU, teste 2 OK.
-- Esperado DEPOIS da correção 12: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_usuario, v_empresa
    from usuarios order by created_at limit 1;

  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  -- "Finge" que o usuário está logado como administrador
  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: cadastrar EPI SEM validade do CA (deve ser permitido) ---
  begin
    insert into epis (empresa_id, nome, ca)
      values (v_empresa, 'EPI teste sem validade', 'CA-V1-' || left(gen_random_uuid()::text, 8));
    v_resultado := 'OK - cadastrou sem validade';
    raise exception using errcode = 'ZZ001';
  exception
    when not_null_violation then v_resultado := 'FALHOU - o banco exigiu a validade do CA';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (EPI sem validade do CA): ' || v_resultado;

  -- TESTE 2: cadastrar EPI COM validade continua funcionando --------
  begin
    insert into epis (empresa_id, nome, ca, validade_ca)
      values (v_empresa, 'EPI teste com validade', 'CA-V2-' || left(gen_random_uuid()::text, 8), current_date + 365);
    v_resultado := 'OK - cadastrou com validade';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (EPI com validade do CA): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
