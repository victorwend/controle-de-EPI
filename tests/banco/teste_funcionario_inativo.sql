-- =============================================================
-- TESTE DE FUNCIONÁRIO INATIVO (DESLIGADO) — EPI360 (EPI-330)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: o administrador inativa um funcionário desligado e
-- depois o reativa. Um gestor tenta inativar e não consegue.
--
-- Esperado ANTES da correção 18: testes 1 a 4 FALHOU.
-- Esperado DEPOIS da correção 18: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_func      uuid;
  v_local     uuid;
  v_epi       uuid;
  v_linhas    integer;
  v_texto     text;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_usuario;

  insert into funcionarios (empresa_id, matricula, nome, data_admissao)
    values (v_empresa, 'TFI-' || left(gen_random_uuid()::text, 8), 'Funcionário teste desligamento', current_date - 100)
    returning id into v_func;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste desligamento') returning id into v_local;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste desligamento', 'CA-TFI-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_local, 5);

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: inativar sem data -> grava a data de hoje ----------------
  -- (as colunas são lidas por SQL dinâmico para o teste rodar mesmo
  --  antes da correção 18, quando elas ainda não existem)
  begin
    execute format('update funcionarios set status = %L, motivo_desligamento = %L where id = %L',
                   'inativo', 'Fim de contrato', v_func);
    execute format('select data_desligamento::text from funcionarios where id = %L', v_func) into v_texto;
    v_resultado := case when v_texto = current_date::text then 'OK - gravou a data de hoje'
                        else 'FALHOU - data gravada: ' || coalesce(v_texto, 'nenhuma') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (inativar grava a data do desligamento): ' || v_resultado;

  -- TESTE 2: reativar limpa a data e o motivo -------------------------
  begin
    update funcionarios set status = 'ativo' where id = v_func;
    execute format('select coalesce(data_desligamento::text, '''') || coalesce(motivo_desligamento, '''') from funcionarios where id = %L', v_func)
      into v_texto;
    v_resultado := case when v_texto = '' then 'OK - data e motivo limpos'
                        else 'FALHOU - ficou: ' || v_texto end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (reativar limpa data e motivo): ' || v_resultado;

  -- TESTE 3: desligamento ANTES da admissão é recusado ----------------
  begin
    execute format('update funcionarios set status = %L, data_desligamento = %L where id = %L',
                   'inativo', current_date - 200, v_func);
    v_resultado := 'FALHOU - aceitou desligamento antes da admissão';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when check_violation then v_resultado := 'OK - o banco recusou';
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (desligamento antes da admissão): ' || v_resultado;

  -- TESTE 4: funcionário ATIVO com data de desligamento é recusado ----
  begin
    execute format('update funcionarios set data_desligamento = %L where id = %L', current_date, v_func);
    v_resultado := 'FALHOU - ativo ficou com data de desligamento';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when check_violation then v_resultado := 'OK - o banco recusou';
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (ativo com data de desligamento): ' || v_resultado;

  -- TESTE 5: funcionário inativo não recebe entrega -------------------
  begin
    update funcionarios set status = 'inativo' where id = v_func;
    perform registrar_entrega(v_func, v_local,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'FALHOU - entregou para funcionário inativo';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (entrega para inativo): ' || v_resultado;

  -- TESTE 6: GESTOR não inativa funcionário ---------------------------
  execute 'reset role';
  update usuarios set perfil = 'gestor' where id = v_usuario;
  execute 'set local role authenticated';
  update funcionarios set status = 'inativo' where id = v_func;
  get diagnostics v_linhas = row_count;
  v_relatorio := v_relatorio || E'\nTESTE 6 (gestor inativa funcionário): ' ||
    case when v_linhas = 0 then 'OK - o banco não deixou' else 'FALHOU - gestor inativou' end;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
