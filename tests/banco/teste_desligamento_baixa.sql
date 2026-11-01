-- =============================================================
-- TESTE DO MOTIVO DA ENTREGA E DA BAIXA NO DESLIGAMENTO — EPI360 (EPI-340)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: funcionário recebe 2 EPIs na admissão. No desligamento, um
-- volta para o estoque e o outro foi perdido. Ele só pode ser desligado
-- depois de dar baixa em TUDO o que está com ele.
--
-- Esperado ANTES da correção 24: todos FALHOU.
-- Esperado DEPOIS da correção 24: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_func      uuid;
  v_func2     uuid;
  v_antigo    uuid;
  v_local     uuid;
  v_capacete  uuid;
  v_luva      uuid;
  v_comp      text;
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

  insert into funcionarios (empresa_id, matricula, nome, data_admissao)
    values (v_empresa, 'TDB1-' || v_sufixo, 'Func desligamento', current_date - 60) returning id into v_func;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TDB2-' || v_sufixo, 'Func baixa parcial') returning id into v_func2;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste desligamento') returning id into v_local;
  insert into epis (empresa_id, nome, ca) values (v_empresa, 'Capacete teste baixa', 'CA-DB1-' || v_sufixo) returning id into v_capacete;
  insert into epis (empresa_id, nome, ca) values (v_empresa, 'Luva teste baixa', 'CA-DB2-' || v_sufixo) returning id into v_luva;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
    values (v_empresa, v_capacete, v_local, 10), (v_empresa, v_luva, v_local, 10);

  -- Funcionário que JÁ estava inativo com EPI em posse (antes desta correção)
  insert into funcionarios (empresa_id, matricula, nome, status)
    values (v_empresa, 'TDB3-' || v_sufixo, 'Func já desligado', 'inativo') returning id into v_antigo;
  insert into posse_epi_funcionario (empresa_id, funcionario_id, epi_id, quantidade) values (v_empresa, v_antigo, v_luva, 2);

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: entrega de ADMISSÃO grava o motivo -------------------------
  begin
    execute 'select registrar_entrega($1, $2, $3, null, ''confirmacao_responsavel'', ''admissao'')' into v_comp
      using v_func, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_capacete, 'quantidade', 1),
                                                 jsonb_build_object('epi_id', v_luva, 'quantidade', 1));
    execute 'select motivo from entregas where comprovante = $1' into v_texto using v_comp;
    v_resultado := case when v_texto = 'admissao' then 'OK - gravou admissao' else 'FALHOU - gravou ' || coalesce(v_texto, 'nada') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (motivo da entrega): ' || v_resultado;

  -- TESTE 2: entrega SEM motivo ou com motivo inventado é recusada -----
  begin
    begin
      execute 'select registrar_entrega($1, $2, $3, null, ''confirmacao_responsavel'', null)'
        using v_func2, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_luva, 'quantidade', 1));
      v_resultado := 'FALHOU - aceitou sem motivo';
    exception when others then
      begin
        execute 'select registrar_entrega($1, $2, $3, null, ''confirmacao_responsavel'', ''presente'')'
          using v_func2, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_luva, 'quantidade', 1));
        v_resultado := 'FALHOU - aceitou motivo inventado';
      exception
        when undefined_function then v_resultado := 'FALHOU - a função com motivo não existe';
        when others then v_resultado := 'OK - recusou os dois';
      end;
    end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (motivo obrigatório e válido): ' || v_resultado;

  -- TESTE 3: inativar direto, com EPI em posse, é recusado -------------
  begin
    update funcionarios set status = 'inativo' where id = v_func;
    v_resultado := 'FALHOU - desligou sem dar baixa nos EPIs';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (desligar sem baixa): ' || v_resultado;

  -- TESTE 4: baixa PARCIAL no desligamento é recusada -------------------
  begin
    execute 'select desligar_funcionario($1, current_date, ''Fim de contrato'', $2, $3)'
      using v_func, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_capacete, 'quantidade', 1, 'destino', 'estoque'));
    v_resultado := 'FALHOU - desligou com a luva ainda em posse';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função desligar_funcionario não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (baixa parcial): ' || v_resultado;

  -- TESTE 5: desligamento com baixa de TUDO -----------------------------
  -- capacete volta ao estoque; luva foi perdida
  begin
    execute 'select desligar_funcionario($1, current_date, ''Fim de contrato'', $2, $3)'
      using v_func, v_local, jsonb_build_array(
        jsonb_build_object('epi_id', v_capacete, 'quantidade', 1, 'destino', 'estoque'),
        jsonb_build_object('epi_id', v_luva, 'quantidade', 1, 'destino', 'perda'));
    select coalesce(sum(quantidade), 0) into v_qtd from posse_epi_funcionario where funcionario_id = v_func;
    select status into v_texto from funcionarios where id = v_func;
    v_resultado := case when v_qtd = 0 and v_texto = 'inativo' then 'OK - sem posse e inativo'
                        else 'FALHOU - posse ' || v_qtd || ', status ' || v_texto end;
    select saldo into v_qtd from saldo_estoque where epi_id = v_capacete and local_id = v_local;
    if v_qtd <> 10 then v_resultado := 'FALHOU - capacete não voltou ao estoque (saldo ' || v_qtd || ')'; end if;
    select saldo into v_qtd from saldo_estoque where epi_id = v_luva and local_id = v_local;
    if v_qtd <> 9 then v_resultado := 'FALHOU - luva perdida voltou ao estoque (saldo ' || v_qtd || ')'; end if;
    execute 'select count(*) from trocas_devolucoes_itens where funcionario_id = $1 and destino = ''perda''' into v_qtd using v_func;
    if v_qtd <> 1 then v_resultado := 'FALHOU - perda não registrada'; end if;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (desligar com baixa de tudo): ' || v_resultado;

  -- TESTE 6: quem JÁ estava inativo pode DEVOLVER, mas não TROCAR ------
  begin
    perform registrar_troca_devolucao(v_antigo, v_local, 'Devolução após desligamento',
      jsonb_build_array(jsonb_build_object('epi_id', v_luva, 'quantidade', 1, 'acao', 'devolucao', 'destino', 'estoque')));
    begin
      perform registrar_troca_devolucao(v_antigo, v_local, 'teste',
        jsonb_build_array(jsonb_build_object('epi_id', v_luva, 'quantidade', 1, 'acao', 'troca', 'destino', 'descarte')));
      v_resultado := 'FALHOU - fez troca (nova entrega) para inativo';
    exception when others then
      v_resultado := 'OK - devolveu e recusou a troca';
    end;
  exception when others then
    v_resultado := 'FALHOU - não deixou devolver: ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 6 (devolução de quem já saiu): ' || v_resultado;

  -- TESTE 7: devolução com destino "perda" -------------------------------
  begin
    perform registrar_troca_devolucao(v_antigo, v_local, 'Extraviado',
      jsonb_build_array(jsonb_build_object('epi_id', v_luva, 'quantidade', 1, 'acao', 'devolucao', 'destino', 'perda')));
    select coalesce(sum(quantidade), 0) into v_qtd from posse_epi_funcionario where funcionario_id = v_antigo;
    v_resultado := case when v_qtd = 0 then 'OK - baixa por perda' else 'FALHOU - ainda tem ' || v_qtd end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (perda/extravio): ' || v_resultado;

  -- TESTE 8: GESTOR não desliga -------------------------------------------
  execute 'reset role';
  update usuarios set perfil = 'gestor' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    execute 'select desligar_funcionario($1, current_date, ''x'', $2, ''[]''::jsonb)' using v_func2, v_local;
    v_resultado := 'FALHOU - gestor desligou';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when undefined_function then v_resultado := 'FALHOU - a função não existe';
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 8 (gestor desliga): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
