-- =============================================================
-- TESTE DE PROTEÇÃO DO HISTÓRICO — EPI360
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 10: testes 1, 2 e 3 FALHOU.
-- Esperado DEPOIS da correção 10: todos OK.
-- =============================================================
do $$
declare
  v_usuario     uuid;
  v_empresa     uuid;
  v_local       uuid;  -- local usado na entrega
  v_local_mov   uuid;  -- local que só tem uma entrada de estoque
  v_epi_entrega uuid;  -- EPI que foi entregue
  v_epi_mov     uuid;  -- EPI que só tem uma entrada de estoque
  v_epi_livre   uuid;  -- EPI sem nenhum histórico
  v_func_hist   uuid;  -- funcionário que recebeu EPI
  v_func_livre  uuid;  -- funcionário sem nenhum histórico
  v_entrega     uuid;
  v_linhas      integer;
  v_resultado   text;
  v_relatorio   text := '';
begin
  -- Preparação (feita como dono do banco, sem RLS) -----------------
  select id, empresa_id into v_usuario, v_empresa
    from usuarios order by created_at limit 1;

  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local de teste (entrega)') returning id into v_local;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local de teste (só entrada)') returning id into v_local_mov;

  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste entregue', 'CA-H1-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi_entrega;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste só entrada', 'CA-H2-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi_mov;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste sem histórico', 'CA-H3-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi_livre;

  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TH1-' || left(gen_random_uuid()::text, 8), 'Funcionário teste com entrega')
    returning id into v_func_hist;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TH2-' || left(gen_random_uuid()::text, 8), 'Funcionário teste sem histórico')
    returning id into v_func_livre;

  -- Entrada de estoque do EPI "só entrada" no local "só entrada"
  insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_destino_id, quantidade, responsavel_usuario_id)
    values (v_empresa, 'entrada', v_epi_mov, v_local_mov, 10, v_usuario);
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
    values (v_empresa, v_epi_mov, v_local_mov, 10);

  -- Entrega do EPI "entregue" para o funcionário "com entrega"
  insert into entregas (empresa_id, funcionario_id, local_id, comprovante, responsavel_usuario_id)
    values (v_empresa, v_func_hist, v_local, 'TESTE-HIST', v_usuario)
    returning id into v_entrega;
  insert into entrega_itens (entrega_id, epi_id, quantidade) values (v_entrega, v_epi_entrega, 1);

  -- "Finge" que o usuário está logado como administrador ------------
  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Cada teste roda num bloco próprio. Se o banco deixar apagar, o
  -- bloco é desfeito na hora (erro ZZ001), para um teste não
  -- atrapalhar o seguinte.

  -- TESTE 1: apagar funcionário que já recebeu EPI -------------------
  begin
    delete from funcionarios where id = v_func_hist;
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      v_resultado := 'ERRO NO TESTE - o funcionário não foi encontrado';
    else
      v_resultado := 'FALHOU - funcionário apagado junto com a entrega';
    end if;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then
      v_resultado := 'OK - o banco bloqueou';
    when sqlstate 'ZZ001' then
      null;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (apagar funcionário com entrega): ' || v_resultado;

  -- TESTE 2: apagar EPI que tem movimentação de estoque --------------
  begin
    delete from epis where id = v_epi_mov;
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      v_resultado := 'ERRO NO TESTE - o EPI não foi encontrado';
    else
      v_resultado := 'FALHOU - EPI apagado junto com a movimentação e o saldo';
    end if;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then
      v_resultado := 'OK - o banco bloqueou';
    when sqlstate 'ZZ001' then
      null;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (apagar EPI com movimentação): ' || v_resultado;

  -- TESTE 3: apagar local que tem movimentação de estoque ------------
  begin
    delete from locais_estoque where id = v_local_mov;
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      v_resultado := 'ERRO NO TESTE - o local não foi encontrado';
    else
      v_resultado := 'FALHOU - local apagado; a movimentação perdeu o destino';
    end if;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then
      v_resultado := 'OK - o banco bloqueou';
    when sqlstate 'ZZ001' then
      null;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (apagar local com movimentação): ' || v_resultado;

  -- TESTE 4: apagar funcionário SEM histórico (deve ser permitido) ---
  begin
    delete from funcionarios where id = v_func_livre;
    get diagnostics v_linhas = row_count;
    if v_linhas = 1 then
      v_resultado := 'OK - apagou normalmente';
    else
      v_resultado := 'FALHOU - não apagou';
    end if;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then
      v_resultado := 'FALHOU - o banco bloqueou sem necessidade';
    when sqlstate 'ZZ001' then
      null;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (apagar funcionário sem histórico): ' || v_resultado;

  -- TESTE 5: apagar EPI SEM histórico (deve ser permitido) -----------
  begin
    delete from epis where id = v_epi_livre;
    get diagnostics v_linhas = row_count;
    if v_linhas = 1 then
      v_resultado := 'OK - apagou normalmente';
    else
      v_resultado := 'FALHOU - não apagou';
    end if;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then
      v_resultado := 'FALHOU - o banco bloqueou sem necessidade';
    when sqlstate 'ZZ001' then
      null;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (apagar EPI sem histórico): ' || v_resultado;

  execute 'reset role';

  -- Desfaz TUDO (locais, EPIs, funcionários, movimentação, entrega) --
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
