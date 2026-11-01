-- =============================================================
-- TESTE DA MATRIZ EPI x FUNÇÃO — EPI360 (EPI-280)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 21: todos FALHOU (as tabelas não existem).
-- Esperado DEPOIS da correção 21: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_empresa_b uuid;
  v_f1        uuid;
  v_f2        uuid;
  v_funcao    uuid;
  v_funcao2   uuid;
  v_vazia     uuid;
  v_epi1      uuid;
  v_epi2      uuid;
  v_epi_b     uuid;
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

  insert into epis (empresa_id, nome, ca) values (v_empresa, 'Capacete teste matriz', 'CA-M1-' || v_sufixo) returning id into v_epi1;
  insert into epis (empresa_id, nome, ca) values (v_empresa, 'Luva teste matriz', 'CA-M2-' || v_sufixo) returning id into v_epi2;
  insert into empresas (razao_social, cnpj) values ('Empresa teste matriz B', 'TESTE-' || v_sufixo) returning id into v_empresa_b;
  insert into epis (empresa_id, nome, ca) values (v_empresa_b, 'EPI da empresa B', 'CA-MB-' || v_sufixo) returning id into v_epi_b;

  -- TESTE 1: a função digitada no funcionário vira UMA função ---------
  -- (" servente X " e "Servente x" são a mesma função)
  begin
    insert into funcionarios (empresa_id, matricula, nome, funcao)
      values (v_empresa, 'TMF1-' || v_sufixo, 'Func matriz 1', ' servente ' || v_sufixo || ' ') returning id into v_f1;
    insert into funcionarios (empresa_id, matricula, nome, funcao)
      values (v_empresa, 'TMF2-' || v_sufixo, 'Func matriz 2', 'SERVENTE ' || upper(v_sufixo)) returning id into v_f2;
    execute 'select funcao_id from funcionarios where id = $1' into v_funcao using v_f1;
    execute 'select funcao_id from funcionarios where id = $1' into v_funcao2 using v_f2;
    execute 'select count(*) from funcoes where empresa_id = $1 and lower(nome) = lower($2)'
      into v_qtd using v_empresa, 'servente ' || v_sufixo;
    v_resultado := case when v_funcao is not null and v_funcao = v_funcao2 and v_qtd = 1
                        then 'OK - uma função só' else 'FALHOU - funções diferentes ou não criadas' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (função do funcionário vira uma função): ' || v_resultado;

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 2: renomear a função atualiza os funcionários ---------------
  begin
    execute 'update funcoes set nome = $1 where id = $2' using 'Servente civil ' || v_sufixo, v_funcao;
    select funcao into v_texto from funcionarios where id = v_f1;
    v_resultado := case when v_texto = 'Servente civil ' || v_sufixo then 'OK - funcionário com o nome novo'
                        else 'FALHOU - ficou: ' || coalesce(v_texto, 'vazio') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (renomear função): ' || v_resultado;

  -- TESTE 3: salvar a matriz com 2 EPIs e quantidades -----------------
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao,
      jsonb_build_array(
        jsonb_build_object('epi_id', v_epi1, 'quantidade', 1, 'obrigatorio', true, 'periodicidade_meses', 12),
        jsonb_build_object('epi_id', v_epi2, 'quantidade', 2, 'obrigatorio', true));
    execute 'select count(*), sum(quantidade) from matriz_epi_funcao where funcao_id = $1' into v_qtd, v_texto using v_funcao;
    v_resultado := case when v_qtd = 2 and v_texto = '3' then 'OK - 2 EPIs, 3 unidades'
                        else 'FALHOU - ' || v_qtd || ' EPIs, ' || coalesce(v_texto, '0') || ' unidades' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (salvar matriz): ' || v_resultado;

  -- TESTE 4: salvar de novo substitui (alterar quantidade, tirar EPI) -
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi2, 'quantidade', 4, 'obrigatorio', false));
    execute 'select count(*), max(quantidade) from matriz_epi_funcao where funcao_id = $1' into v_qtd, v_texto using v_funcao;
    v_resultado := case when v_qtd = 1 and v_texto = '4' then 'OK - ficou 1 EPI com 4 unidades'
                        else 'FALHOU - ' || v_qtd || ' EPIs, máx ' || coalesce(v_texto, '0') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (alterar a matriz): ' || v_resultado;

  -- TESTE 5: quantidade zero é recusada --------------------------------
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi1, 'quantidade', 0));
    v_resultado := 'FALHOU - aceitou quantidade 0';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função salvar_matriz_funcao não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (quantidade zero): ' || v_resultado;

  -- TESTE 6: EPI de outra empresa é recusado --------------------------
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi_b, 'quantidade', 1));
    v_resultado := 'FALHOU - aceitou EPI de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função salvar_matriz_funcao não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 6 (EPI de outra empresa): ' || v_resultado;

  -- TESTE 7: GESTOR (sem permissão de EPIs) não altera a matriz -------
  execute 'reset role';
  update usuarios set perfil = 'gestor' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao, '[]'::jsonb;
    v_resultado := 'FALHOU - gestor alterou a matriz';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (gestor altera a matriz): ' || v_resultado;

  -- TESTE 8: TÉCNICO DE SEGURANÇA (padrão: pode EPIs) altera -----------
  execute 'reset role';
  update usuarios set perfil = 'tecnico_seguranca' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    execute 'select salvar_matriz_funcao($1, $2)' using v_funcao,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi1, 'quantidade', 1));
    v_resultado := 'OK - técnico salvou';
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 8 (técnico altera a matriz): ' || v_resultado;

  -- TESTE 9: função EM USO não é excluída; função sem uso é -----------
  begin
    begin
      execute 'delete from funcoes where id = $1' using v_funcao;
      v_resultado := 'FALHOU - excluiu função em uso';
    exception when others then
      execute 'insert into funcoes (empresa_id, nome) values ($1, $2) returning id' into v_vazia using v_empresa, 'Função vazia ' || v_sufixo;
      execute 'delete from funcoes where id = $1' using v_vazia;
      get diagnostics v_qtd = row_count;
      v_resultado := case when v_qtd = 1 then 'OK - em uso recusada, sem uso excluída' else 'FALHOU - não excluiu a função sem uso' end;
    end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 9 (excluir função): ' || v_resultado;

  -- TESTE 10: matriz e funções de OUTRA empresa não aparecem ----------
  execute 'reset role';
  begin
    execute 'insert into funcoes (empresa_id, nome) values ($1, $2) returning id' into v_vazia using v_empresa_b, 'Função B ' || v_sufixo;
    execute 'insert into matriz_epi_funcao (empresa_id, funcao_id, epi_id, quantidade) values ($1, $2, $3, 1)' using v_empresa_b, v_vazia, v_epi_b;
    execute 'set local role authenticated';
    execute 'select (select count(*) from funcoes where empresa_id = $1) + (select count(*) from matriz_epi_funcao where empresa_id = $1)'
      into v_qtd using v_empresa_b;
    v_resultado := case when v_qtd = 0 then 'OK - não vê' else 'FALHOU - vê ' || v_qtd || ' registros' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 10 (outra empresa): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
