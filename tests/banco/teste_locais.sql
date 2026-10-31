-- =============================================================
-- TESTE DE LOCAIS DE ESTOQUE — EPI360 (EPI-326)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 13: testes 1 e 4 FALHOU.
-- Esperado DEPOIS da correção 13: todos OK.
-- =============================================================
do $$
declare
  v_usuario    uuid;
  v_empresa    uuid;
  v_epi        uuid;
  v_local_com  uuid;  -- local com saldo
  v_local_sem  uuid;  -- local sem saldo
  v_local_ina  uuid;  -- local já inativo
  v_linhas     integer;
  v_resultado  text;
  v_relatorio  text := '';
begin
  select id, empresa_id into v_usuario, v_empresa
    from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste locais', 'CA-L1-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste com saldo') returning id into v_local_com;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste sem saldo') returning id into v_local_sem;
  insert into locais_estoque (empresa_id, nome, status) values (v_empresa, 'Local teste inativo', 'inativo') returning id into v_local_ina;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_local_com, 7);

  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: inativar local que ainda tem EPI em estoque -> bloquear
  begin
    update locais_estoque set status = 'inativo' where id = v_local_com;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'FALHOU - inativou com 7 EPIs no estoque'
                        else 'ERRO NO TESTE - local não encontrado' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then
      v_resultado := case when sqlerrm ilike '%ainda tem%' then 'OK - o banco bloqueou'
                          else 'ERRO NO TESTE - ' || sqlerrm end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (inativar local com saldo): ' || v_resultado;

  -- TESTE 2: inativar local sem saldo -> permitir ----------------------
  begin
    update locais_estoque set status = 'inativo' where id = v_local_sem;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'OK - inativou normalmente' else 'FALHOU - não inativou' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (inativar local sem saldo): ' || v_resultado;

  -- TESTE 3: editar nome e código de um local -> permitir --------------
  begin
    update locais_estoque set nome = 'Local renomeado', codigo = 'TL-' || left(gen_random_uuid()::text, 6) where id = v_local_com;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'OK - editou normalmente' else 'FALHOU - não editou' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (editar local): ' || v_resultado;

  -- TESTE 4: dar entrada de estoque num local INATIVO -> bloquear ------
  begin
    perform registrar_entrada_estoque(v_epi, v_local_ina, 5);
    v_resultado := 'FALHOU - deu entrada num local inativo';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (entrada em local inativo): ' || v_resultado;

  -- TESTE 5: reativar local inativo -> permitir ------------------------
  begin
    update locais_estoque set status = 'ativo' where id = v_local_ina;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'OK - reativou normalmente' else 'FALHOU - não reativou' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (reativar local): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
