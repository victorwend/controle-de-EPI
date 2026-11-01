-- =============================================================
-- TESTE DE ISOLAMENTO ENTRE EMPRESAS — EPI360 (EPI-272)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: o usuário logado é da empresa A. O teste cria uma
-- empresa B com EPI, local, funcionário, saldo e posse, e tenta
-- usar esses IDs nas 4 funções de negócio.
--
-- Esperado ANTES da correção 11: testes 1 a 6 FALHOU, teste 7 OK.
-- Esperado DEPOIS da correção 11: todos OK.
-- =============================================================
do $$
declare
  v_usuario    uuid;
  v_empresa_a  uuid;
  v_empresa_b  uuid;
  v_local_a    uuid;
  v_local_b    uuid;
  v_epi_a      uuid;
  v_epi_b      uuid;
  v_func_a     uuid;
  v_func_b     uuid;
  v_resultado  text;
  v_relatorio  text := '';
begin
  -- Preparação (feita como dono do banco, sem RLS) -----------------
  select id, empresa_id into v_usuario, v_empresa_a
    from usuarios order by created_at limit 1;

  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  -- Empresa A (a do usuário logado)
  insert into locais_estoque (empresa_id, nome) values (v_empresa_a, 'Local teste A') returning id into v_local_a;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa_a, 'EPI teste A', 'CA-IA-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi_a;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa_a, 'TIA-' || left(gen_random_uuid()::text, 8), 'Funcionário teste A')
    returning id into v_func_a;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa_a, v_epi_a, v_local_a, 10);

  -- Empresa B (outra empresa)
  insert into empresas (razao_social, cnpj)
    values ('Empresa teste B', 'TESTE-' || left(gen_random_uuid()::text, 8))
    returning id into v_empresa_b;
  insert into locais_estoque (empresa_id, nome) values (v_empresa_b, 'Local teste B') returning id into v_local_b;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa_b, 'EPI teste B', 'CA-IB-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi_b;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa_b, 'TIB-' || left(gen_random_uuid()::text, 8), 'Funcionário teste B')
    returning id into v_func_b;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa_b, v_epi_b, v_local_b, 10);
  insert into posse_epi_funcionario (empresa_id, funcionario_id, epi_id, quantidade) values (v_empresa_b, v_func_b, v_epi_b, 1);

  -- "Finge" que o usuário da empresa A está logado como administrador
  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Regra de leitura de cada teste:
  --   erro 42501 (sem permissão)  -> OK, o banco recusou
  --   a função rodou sem erro     -> FALHOU, o banco aceitou
  --   outro erro                  -> ERRO NO TESTE (mostra a mensagem)
  -- O bloco de cada teste é desfeito no fim (erro ZZ001), para um
  -- teste não atrapalhar o seguinte.

  -- TESTE 1: entrada de estoque com EPI da empresa B ----------------
  begin
    perform registrar_entrada_estoque(v_epi_b, v_local_a, 5);
    v_resultado := 'FALHOU - aceitou EPI de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (entrada com EPI de outra empresa): ' || v_resultado;

  -- TESTE 2: entrada de estoque no local da empresa B ---------------
  begin
    perform registrar_entrada_estoque(v_epi_a, v_local_b, 5);
    v_resultado := 'FALHOU - aceitou local de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (entrada em local de outra empresa): ' || v_resultado;

  -- TESTE 3: transferir o estoque da empresa B para a empresa A -----
  begin
    perform transferir_estoque(v_epi_b, v_local_b, v_local_a, 5);
    v_resultado := 'FALHOU - transferiu estoque de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (transferir estoque de outra empresa): ' || v_resultado;

  -- TESTE 4: entregar EPI para funcionário da empresa B -------------
  begin
    perform registrar_entrega(v_func_b, v_local_a,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi_a, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'FALHOU - entregou para funcionário de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (entrega para funcionário de outra empresa): ' || v_resultado;

  -- TESTE 5: entregar EPI tirado do estoque da empresa B ------------
  begin
    perform registrar_entrega(v_func_a, v_local_b,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi_b, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'FALHOU - entregou EPI do estoque de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (entrega com estoque de outra empresa): ' || v_resultado;

  -- TESTE 6: devolução de funcionário da empresa B ------------------
  begin
    perform registrar_troca_devolucao(v_func_b, v_local_a, 'teste',
      jsonb_build_array(jsonb_build_object('epi_id', v_epi_b, 'quantidade', 1,
                                           'acao', 'devolucao', 'destino', 'estoque')));
    v_resultado := 'FALHOU - registrou devolução de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 6 (devolução de funcionário de outra empresa): ' || v_resultado;

  -- TESTE 7: entrada só com dados da própria empresa (deve funcionar)
  begin
    perform registrar_entrada_estoque(v_epi_a, v_local_a, 5);
    v_resultado := 'OK - funcionou normalmente';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - recusou dados da própria empresa: ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (entrada com dados da própria empresa): ' || v_resultado;

  execute 'reset role';

  -- Desfaz TUDO (empresa B, locais, EPIs, funcionários, saldos) -----
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
