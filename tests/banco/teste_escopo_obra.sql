-- =============================================================
-- TESTE DE ESCOPO POR OBRA — EPI360 (EPI-274, RN-011 e RN-045)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: um ALMOXARIFE liberado só para a obra 1 tenta ver e usar
-- dados da obra 2. Itens "sem obra" (sede/central) são de todos.
--
-- Esperado ANTES da correção 16: testes 2 a 7 FALHOU.
-- Esperado DEPOIS da correção 16: todos OK.
-- =============================================================
do $$
declare
  v_usuario  uuid;
  v_empresa  uuid;
  v_obra1    uuid;
  v_obra2    uuid;
  v_f1       uuid;  -- funcionário da obra 1
  v_f2       uuid;  -- funcionário da obra 2
  v_f0       uuid;  -- funcionário sem obra (sede)
  v_l1       uuid;  -- local da obra 1
  v_l2       uuid;  -- local da obra 2
  v_lc       uuid;  -- local central (sem obra)
  v_epi      uuid;
  v_qtd      integer;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into obras (empresa_id, nome) values (v_empresa, 'Obra teste 1') returning id into v_obra1;
  insert into obras (empresa_id, nome) values (v_empresa, 'Obra teste 2') returning id into v_obra2;
  insert into funcionarios (empresa_id, matricula, nome, obra_id) values (v_empresa, 'TO1-' || left(gen_random_uuid()::text, 8), 'Func obra 1', v_obra1) returning id into v_f1;
  insert into funcionarios (empresa_id, matricula, nome, obra_id) values (v_empresa, 'TO2-' || left(gen_random_uuid()::text, 8), 'Func obra 2', v_obra2) returning id into v_f2;
  insert into funcionarios (empresa_id, matricula, nome) values (v_empresa, 'TO0-' || left(gen_random_uuid()::text, 8), 'Func sede') returning id into v_f0;
  insert into locais_estoque (empresa_id, nome, obra_id) values (v_empresa, 'Local obra 1', v_obra1) returning id into v_l1;
  insert into locais_estoque (empresa_id, nome, obra_id) values (v_empresa, 'Local obra 2', v_obra2) returning id into v_l2;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local central') returning id into v_lc;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste escopo', 'CA-ES-' || left(gen_random_uuid()::text, 8), current_date + 365) returning id into v_epi;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_l1, 5), (v_empresa, v_epi, v_l2, 5);

  delete from usuario_obras where usuario_id = v_usuario;
  insert into usuario_obras (usuario_id, obra_id) values (v_usuario, v_obra1);
  update usuarios set perfil = 'almoxarife' where id = v_usuario;

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: vê o funcionário da própria obra ------------------------
  select count(*) into v_qtd from funcionarios where id = v_f1;
  v_relatorio := v_relatorio || E'\nTESTE 1 (vê funcionário da sua obra): ' ||
    case when v_qtd = 1 then 'OK - vê' else 'FALHOU - não vê' end;

  -- TESTE 2: NÃO vê o funcionário da outra obra ----------------------
  select count(*) into v_qtd from funcionarios where id = v_f2;
  v_relatorio := v_relatorio || E'\nTESTE 2 (funcionário de outra obra): ' ||
    case when v_qtd = 0 then 'OK - não vê' else 'FALHOU - vê funcionário de outra obra' end;

  -- TESTE 3: NÃO vê a outra obra --------------------------------------
  select count(*) into v_qtd from obras where id = v_obra2;
  v_relatorio := v_relatorio || E'\nTESTE 3 (obra não liberada): ' ||
    case when v_qtd = 0 then 'OK - não vê' else 'FALHOU - vê obra não liberada' end;

  -- TESTE 4: NÃO vê o local nem o saldo da outra obra -----------------
  select count(*) into v_qtd from locais_estoque where id = v_l2;
  select v_qtd + count(*) into v_qtd from saldo_estoque where local_id = v_l2;
  v_relatorio := v_relatorio || E'\nTESTE 4 (local e saldo de outra obra): ' ||
    case when v_qtd = 0 then 'OK - não vê' else 'FALHOU - vê local/saldo de outra obra' end;

  -- TESTE 5: NÃO dá entrada no local da outra obra --------------------
  begin
    perform registrar_entrada_estoque(v_epi, v_l2, 1);
    v_resultado := 'FALHOU - deu entrada no estoque de outra obra';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (entrada no estoque de outra obra): ' || v_resultado;

  -- TESTE 6: NÃO entrega para funcionário da outra obra ---------------
  begin
    perform registrar_entrega(v_f2, v_l1,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'FALHOU - entregou para funcionário de outra obra';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 6 (entrega para funcionário de outra obra): ' || v_resultado;

  -- TESTE 7: NÃO edita local da outra obra -----------------------------
  update locais_estoque set nome = 'invadido' where id = v_l2;
  get diagnostics v_qtd = row_count;
  v_relatorio := v_relatorio || E'\nTESTE 7 (editar local de outra obra): ' ||
    case when v_qtd = 0 then 'OK - não editou' else 'FALHOU - editou local de outra obra' end;

  -- TESTE 8: vê o que é da sede (sem obra) ----------------------------
  select count(*) into v_qtd from funcionarios where id = v_f0;
  select v_qtd + count(*) into v_qtd from locais_estoque where id = v_lc;
  v_relatorio := v_relatorio || E'\nTESTE 8 (itens da sede, sem obra): ' ||
    case when v_qtd = 2 then 'OK - vê' else 'FALHOU - não vê itens da sede' end;

  -- TESTE 9: entrega normal na própria obra continua funcionando ------
  begin
    perform registrar_entrega(v_f1, v_l1,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'OK - entregou normalmente';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 9 (entrega na própria obra): ' || v_resultado;

  -- TESTE 10: ADMINISTRADOR vê tudo -----------------------------------
  execute 'reset role';
  update usuarios set perfil = 'administrador' where id = v_usuario;
  execute 'set local role authenticated';
  select count(*) into v_qtd from funcionarios where id in (v_f1, v_f2, v_f0);
  v_relatorio := v_relatorio || E'\nTESTE 10 (administrador vê todas as obras): ' ||
    case when v_qtd = 3 then 'OK - vê tudo' else 'FALHOU - administrador não vê tudo' end;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
