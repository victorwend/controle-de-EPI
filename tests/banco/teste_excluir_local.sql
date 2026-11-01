-- =============================================================
-- TESTE DE EXCLUSÃO DE LOCAL DE ESTOQUE — EPI360 (EPI-327)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 15: teste 1 FALHOU.
-- Esperado DEPOIS da correção 15: todos OK.
-- =============================================================
do $$
declare
  v_usuario    uuid;
  v_empresa    uuid;
  v_epi        uuid;
  v_ativo      uuid;  -- local ativo, nunca usado
  v_inativo    uuid;  -- local inativo, nunca usado
  v_com_hist   uuid;  -- local inativo que já teve movimentação
  v_linhas     integer;
  v_resultado  text;
  v_relatorio  text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste exclusão', 'CA-EX-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste ativo') returning id into v_ativo;
  insert into locais_estoque (empresa_id, nome, status) values (v_empresa, 'Local teste inativo', 'inativo') returning id into v_inativo;
  insert into locais_estoque (empresa_id, nome, status) values (v_empresa, 'Local teste com histórico', 'inativo') returning id into v_com_hist;
  insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_destino_id, quantidade, responsavel_usuario_id)
    values (v_empresa, 'entrada', v_epi, v_com_hist, 3, v_usuario);

  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: excluir local ATIVO -> bloquear (precisa inativar antes) ---
  begin
    delete from locais_estoque where id = v_ativo;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'FALHOU - excluiu local ativo' else 'ERRO NO TESTE - local não encontrado' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then
      v_resultado := case when sqlerrm ilike '%inative%' then 'OK - o banco bloqueou' else 'ERRO NO TESTE - ' || sqlerrm end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (excluir local ativo): ' || v_resultado;

  -- TESTE 2: excluir local INATIVO e nunca usado -> permitir ------------
  begin
    delete from locais_estoque where id = v_inativo;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'OK - excluiu normalmente' else 'FALHOU - não excluiu' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (excluir local inativo sem uso): ' || v_resultado;

  -- TESTE 3: excluir local inativo COM histórico -> bloquear ------------
  begin
    delete from locais_estoque where id = v_com_hist;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 1 then 'FALHOU - apagou local com histórico' else 'ERRO NO TESTE - local não encontrado' end;
    raise exception using errcode = 'ZZ001';
  exception
    when foreign_key_violation then v_resultado := 'OK - o banco bloqueou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (excluir local com histórico): ' || v_resultado;

  -- TESTE 4: GESTOR tenta excluir local inativo -> não exclui -----------
  -- (troca o perfil como dono do banco: pelo sistema ninguém muda o
  -- próprio perfil, ver correção 17)
  execute 'reset role';
  update usuarios set perfil = 'gestor' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    delete from locais_estoque where id = v_inativo;
    get diagnostics v_linhas = row_count;
    v_resultado := case when v_linhas = 0 then 'OK - o banco não deixou' else 'FALHOU - gestor excluiu' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (gestor exclui local): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
