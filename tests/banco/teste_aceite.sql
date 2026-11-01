-- =============================================================
-- TESTE DO MÉTODO DE ACEITE DA ENTREGA — EPI360 (EPI-273)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 14: testes 1 a 4 FALHOU ou ERRO NO TESTE.
-- Esperado DEPOIS da correção 14: todos OK.
-- =============================================================
do $$
declare
  v_usuario     uuid;
  v_empresa     uuid;
  v_local       uuid;
  v_epi         uuid;
  v_func        uuid;
  v_func_inat   uuid;
  v_itens       jsonb;
  v_comprovante text;
  v_metodo      text;
  v_resultado   text;
  v_relatorio   text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;

  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste aceite') returning id into v_local;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste aceite', 'CA-AC-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TAC-' || left(gen_random_uuid()::text, 8), 'Funcionário teste aceite') returning id into v_func;
  insert into funcionarios (empresa_id, matricula, nome, status)
    values (v_empresa, 'TAI-' || left(gen_random_uuid()::text, 8), 'Funcionário teste inativo', 'inativo') returning id into v_func_inat;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_local, 10);
  v_itens := jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1));

  update usuarios set perfil = 'administrador' where id = v_usuario;
  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: entrega com "confirmação do responsável" grava esse método
  begin
    execute 'select registrar_entrega($1, $2, $3, null, $4, ''admissao'')'
      into v_comprovante using v_func, v_local, v_itens, 'confirmacao_responsavel';
    select aceite_metodo into v_metodo from entregas where comprovante = v_comprovante;
    v_resultado := case when v_metodo = 'confirmacao_responsavel' then 'OK - gravou confirmacao_responsavel'
                        else 'FALHOU - gravou ' || coalesce(v_metodo, 'nada') end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (confirmação do responsável é gravada): ' || v_resultado;

  -- TESTE 2: entrega SEM informar o método -> recusar (RN-050) ----------
  begin
    perform registrar_entrega(v_func, v_local, v_itens, null);
    v_resultado := 'FALHOU - registrou entrega sem método de aceite';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (entrega sem método de aceite): ' || v_resultado;

  -- TESTE 3: método "biometria" enquanto ela não está ativa -> recusar ---
  begin
    execute 'select registrar_entrega($1, $2, $3, null, $4, ''admissao'')'
      into v_comprovante using v_func, v_local, v_itens, 'biometria';
    v_resultado := 'FALHOU - aceitou biometria simulada';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then
      v_resultado := case when sqlerrm ilike '%não está habilitado%' then 'OK - o banco recusou'
                          else 'FALHOU - ' || sqlerrm end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (biometria ainda não habilitada): ' || v_resultado;

  -- TESTE 4: entrega para funcionário INATIVO -> recusar (RN-044) -------
  begin
    execute 'select registrar_entrega($1, $2, $3, null, $4, ''admissao'')'
      into v_comprovante using v_func_inat, v_local, v_itens, 'confirmacao_responsavel';
    v_resultado := 'FALHOU - entregou para funcionário inativo';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then
      v_resultado := case when sqlerrm ilike '%inativo%' then 'OK - o banco recusou'
                          else 'FALHOU - ' || sqlerrm end;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (entrega para funcionário inativo): ' || v_resultado;

  execute 'reset role';

  -- TESTE 5: não sobra nenhuma entrega marcada como "biometria" ---------
  select case when count(*) = 0 then 'OK - nenhuma entrega com biometria falsa'
              else 'FALHOU - ' || count(*) || ' entrega(s) dizem biometria sem leitura real' end
    into v_resultado
    from entregas where aceite_metodo = 'biometria';
  v_relatorio := v_relatorio || E'\nTESTE 5 (entregas antigas marcadas como simuladas): ' || v_resultado;

  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
