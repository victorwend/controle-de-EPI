-- =============================================================
-- TESTE DE PERMISSÕES (RLS) — EPI360
-- Não altera nada: no final, tudo é desfeito de propósito.
-- Esperado ANTES da correção 09: testes 1, 2 e 3 FALHOU.
-- Esperado DEPOIS da correção 09: todos OK.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
-- =============================================================
do $$
declare
  v_usuario  uuid;
  v_empresa  uuid;
  v_epi      uuid;
  v_local    uuid;
  v_linhas   integer;
  v_func     uuid;
  v_saldo    integer;
  v_antes    integer;
  v_relatorio text := '';
begin
  -- Preparação (feita como dono do banco, sem RLS) -----------------
  select id, empresa_id into v_usuario, v_empresa
    from usuarios order by created_at limit 1;

  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI de teste RLS', 'CA-TESTE-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;

  insert into locais_estoque (empresa_id, nome)
    values (v_empresa, 'Local de teste RLS')
    returning id into v_local;

  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
    values (v_empresa, v_epi, v_local, 10);

  insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_destino_id, quantidade, responsavel_usuario_id)
    values (v_empresa, 'entrada', v_epi, v_local, 10, v_usuario);

  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TESTE-' || left(gen_random_uuid()::text, 8), 'Funcionário de teste RLS')
    returning id into v_func;

  -- "Finge" que esse usuário está logado no sistema -----------------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

  -- TESTE 1: operador tenta cadastrar um EPI ------------------------
  update usuarios set perfil = 'operador' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    insert into epis (empresa_id, nome, ca, validade_ca)
      values (v_empresa, 'EPI criado por operador', 'CA-OP-' || left(gen_random_uuid()::text, 8), current_date + 365);
    v_relatorio := v_relatorio || E'\nTESTE 1 (operador cadastra EPI): FALHOU - o banco aceitou';
  exception when insufficient_privilege then
    v_relatorio := v_relatorio || E'\nTESTE 1 (operador cadastra EPI): OK - o banco recusou';
  end;
  execute 'reset role';

  -- TESTE 2: almoxarife altera o saldo direto, sem movimentação -----
  update usuarios set perfil = 'almoxarife' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    update saldo_estoque set saldo = 999 where epi_id = v_epi and local_id = v_local;
    get diagnostics v_linhas = row_count;
    if v_linhas > 0 then
      v_relatorio := v_relatorio || E'\nTESTE 2 (almoxarife altera saldo direto): FALHOU - saldo alterado';
    else
      v_relatorio := v_relatorio || E'\nTESTE 2 (almoxarife altera saldo direto): OK - nada foi alterado';
    end if;
  exception when insufficient_privilege then
    v_relatorio := v_relatorio || E'\nTESTE 2 (almoxarife altera saldo direto): OK - o banco recusou';
  end;

  -- TESTE 3: almoxarife apaga o histórico de movimentações ----------
  begin
    delete from movimentacoes_estoque where epi_id = v_epi;
    get diagnostics v_linhas = row_count;
    if v_linhas > 0 then
      v_relatorio := v_relatorio || E'\nTESTE 3 (almoxarife apaga movimentação): FALHOU - histórico apagado';
    else
      v_relatorio := v_relatorio || E'\nTESTE 3 (almoxarife apaga movimentação): OK - nada foi apagado';
    end if;
  exception when insufficient_privilege then
    v_relatorio := v_relatorio || E'\nTESTE 3 (almoxarife apaga movimentação): OK - o banco recusou';
  end;

  -- TESTE 4: almoxarife registra entrada PELA FUNÇÃO (deve funcionar) -
  begin
    select saldo into v_antes from saldo_estoque where epi_id = v_epi and local_id = v_local;
    perform registrar_entrada_estoque(v_epi, v_local, 5, 'NF-TESTE');
    select saldo into v_saldo from saldo_estoque where epi_id = v_epi and local_id = v_local;
    if v_saldo = v_antes + 5 then
      v_relatorio := v_relatorio || E'\nTESTE 4 (almoxarife registra entrada pela função): OK - saldo aumentou 5';
    else
      v_relatorio := v_relatorio || E'\nTESTE 4 (almoxarife registra entrada pela função): FALHOU - saldo ficou ' || coalesce(v_saldo::text, 'vazio');
    end if;
  exception when others then
    v_relatorio := v_relatorio || E'\nTESTE 4 (almoxarife registra entrada pela função): FALHOU - erro: ' || sqlerrm;
  end;

  -- TESTE 5: almoxarife registra entrega PELA FUNÇÃO (deve funcionar) -
  begin
    select saldo into v_antes from saldo_estoque where epi_id = v_epi and local_id = v_local;
    perform registrar_entrega(v_func, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 2)));
    select saldo into v_saldo from saldo_estoque where epi_id = v_epi and local_id = v_local;
    if v_saldo = v_antes - 2 then
      v_relatorio := v_relatorio || E'\nTESTE 5 (almoxarife registra entrega pela função): OK - saldo diminuiu 2';
    else
      v_relatorio := v_relatorio || E'\nTESTE 5 (almoxarife registra entrega pela função): FALHOU - saldo ficou ' || coalesce(v_saldo::text, 'vazio');
    end if;
  exception when others then
    v_relatorio := v_relatorio || E'\nTESTE 5 (almoxarife registra entrega pela função): FALHOU - erro: ' || sqlerrm;
  end;
  execute 'reset role';

  -- TESTE 6: operador tenta registrar entrega pela função ------------
  update usuarios set perfil = 'operador' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    perform registrar_entrega(v_func, v_local, jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)));
    v_relatorio := v_relatorio || E'\nTESTE 6 (operador registra entrega): FALHOU - o banco aceitou';
  exception when insufficient_privilege then
    v_relatorio := v_relatorio || E'\nTESTE 6 (operador registra entrega): OK - o banco recusou';
  end;
  execute 'reset role';

  -- Desfaz TUDO (perfil, EPI, local, funcionário, saldo, movimentações, entregas) ------------
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
