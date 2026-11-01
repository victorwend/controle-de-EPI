-- =============================================================
-- TESTE DA TRANSFERÊNCIA DE FUNCIONÁRIO ENTRE OBRAS — EPI360 (EPI-339)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: funcionário da obra 1 recebe um EPI, é transferido para a
-- obra 2 e recebe outro EPI. O histórico precisa guardar em que obra
-- foi cada entrega.
--
-- Esperado ANTES da correção 23: testes 1, 2 e 4 a 8 FALHOU (o 3 já passava).
-- Esperado DEPOIS da correção 23: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_empresa_b uuid;
  v_obra1     uuid;
  v_obra2     uuid;
  v_obra_b    uuid;
  v_func      uuid;
  v_inativo   uuid;
  v_local     uuid;
  v_epi       uuid;
  v_qtd       integer;
  v_texto     text;
  v_resultado text;
  v_relatorio text := '';
  v_sufixo    text := left(gen_random_uuid()::text, 6);
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_usuario;
  delete from usuario_obras where usuario_id = v_usuario;

  insert into obras (empresa_id, nome) values (v_empresa, 'Obra origem ' || v_sufixo) returning id into v_obra1;
  insert into obras (empresa_id, nome) values (v_empresa, 'Obra destino ' || v_sufixo) returning id into v_obra2;
  insert into empresas (razao_social, cnpj) values ('Empresa teste transf B', 'TESTE-' || v_sufixo) returning id into v_empresa_b;
  insert into obras (empresa_id, nome) values (v_empresa_b, 'Obra da empresa B') returning id into v_obra_b;
  insert into funcionarios (empresa_id, matricula, nome, obra_id, data_admissao)
    values (v_empresa, 'TTF-' || v_sufixo, 'Func transferência', v_obra1, current_date - 30) returning id into v_func;
  insert into funcionarios (empresa_id, matricula, nome, obra_id, status)
    values (v_empresa, 'TTI-' || v_sufixo, 'Func inativo', v_obra1, 'inativo') returning id into v_inativo;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Central teste transf') returning id into v_local;
  insert into epis (empresa_id, nome, ca) values (v_empresa, 'EPI teste transf', 'CA-TF-' || v_sufixo) returning id into v_epi;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_local, 10);

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Entrega ANTES da transferência (obra 1)
  perform registrar_entrega(v_func, v_local,
    jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)), null, 'confirmacao_responsavel');

  -- TESTE 1: admin transfere para a obra 2 ------------------------------
  begin
    execute 'select transferir_funcionario($1, $2, current_date, $3)' using v_func, v_obra2, 'Remanejamento';
    select obra_id::text into v_texto from funcionarios where id = v_func;
    execute 'select count(*) from funcionario_transferencias where funcionario_id = $1 and obra_origem_id = $2 and obra_destino_id = $3'
      into v_qtd using v_func, v_obra1, v_obra2;
    v_resultado := case when v_texto = v_obra2::text and v_qtd = 1 then 'OK - mudou de obra e registrou a transferência'
                        else 'FALHOU - obra ' || coalesce(v_texto, '?') || ', registros ' || v_qtd end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (transferir): ' || v_resultado;

  -- Entrega DEPOIS da transferência (obra 2)
  perform registrar_entrega(v_func, v_local,
    jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 2)), null, 'confirmacao_responsavel');

  -- TESTE 2: cada entrega guarda a obra em que foi feita ----------------
  begin
    -- (as duas entregas têm a mesma hora dentro do teste; quem diferencia
    --  é a quantidade: 1 unidade antes da transferência, 2 depois)
    execute 'select string_agg(case when e.obra_id = $2 then ''obra1'' when e.obra_id = $3 then ''obra2'' else ''?'' end, '','' order by i.quantidade)
               from entregas e join entrega_itens i on i.entrega_id = e.id where e.funcionario_id = $1'
      into v_texto using v_func, v_obra1, v_obra2;
    v_resultado := case when v_texto = 'obra1,obra2' then 'OK - obra1, obra2' else 'FALHOU - ' || coalesce(v_texto, 'nada') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (histórico por obra): ' || v_resultado;

  -- TESTE 3: o EPI em posse acompanha o funcionário ---------------------
  select coalesce(sum(quantidade), 0) into v_qtd from posse_epi_funcionario where funcionario_id = v_func;
  v_relatorio := v_relatorio || E'\nTESTE 3 (posse acompanha): ' ||
    case when v_qtd = 3 then 'OK - 3 em posse' else 'FALHOU - ' || v_qtd end;

  -- TESTE 4: ALMOXARIFE só da obra 1 ainda vê a entrega feita lá -------
  execute 'reset role';
  update usuarios set perfil = 'almoxarife' where id = v_usuario;
  insert into usuario_obras (usuario_id, obra_id) values (v_usuario, v_obra1);
  execute 'set local role authenticated';
  select count(*) into v_qtd from entregas where funcionario_id = v_func;
  v_relatorio := v_relatorio || E'\nTESTE 4 (obra antiga vê o histórico dela): ' ||
    case when v_qtd = 1 then 'OK - vê só a entrega da obra 1' else 'FALHOU - vê ' || v_qtd end;

  -- TESTE 5: almoxarife NÃO transfere -----------------------------------
  begin
    execute 'select transferir_funcionario($1, $2, current_date, null)' using v_func, v_obra1;
    v_resultado := 'FALHOU - almoxarife transferiu';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (almoxarife transfere): ' || v_resultado;

  execute 'reset role';
  update usuarios set perfil = 'administrador' where id = v_usuario;
  execute 'set local role authenticated';

  -- TESTE 6: para a MESMA obra ou obra de OUTRA empresa: recusado -------
  begin
    begin
      execute 'select transferir_funcionario($1, $2, current_date, null)' using v_func, v_obra2;
      v_resultado := 'FALHOU - aceitou a mesma obra';
    exception when others then
      begin
        execute 'select transferir_funcionario($1, $2, current_date, null)' using v_func, v_obra_b;
        v_resultado := 'FALHOU - aceitou obra de outra empresa';
      exception
        when undefined_function then v_resultado := 'FALHOU - a função não existe';
        when others then v_resultado := 'OK - recusou as duas';
      end;
    end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 6 (mesma obra / outra empresa): ' || v_resultado;

  -- TESTE 7: funcionário INATIVO não é transferido ----------------------
  begin
    execute 'select transferir_funcionario($1, $2, current_date, null)' using v_inativo, v_obra2;
    v_resultado := 'FALHOU - transferiu inativo';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (inativo): ' || v_resultado;

  -- TESTE 8: data no futuro é recusada ----------------------------------
  begin
    execute 'select transferir_funcionario($1, $2, current_date + 5, null)' using v_func, v_obra1;
    v_resultado := 'FALHOU - aceitou data futura';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 8 (data futura): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
