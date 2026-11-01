-- =============================================================
-- TESTE DE PERMISSÕES CONFIGURÁVEIS — EPI360 (EPI-331)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: o 1º usuário da empresa troca de perfil durante o teste
-- (como dono do banco). Como ADMINISTRADOR ele marca e desmarca
-- caixinhas; como ALMOXARIFE/GESTOR ele tenta usar as permissões.
--
-- Esperado ANTES da correção 19: testes 1, 2, 3, 5, 6, 7, 8 e 10 FALHOU.
-- Esperado DEPOIS da correção 19: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_empresa_b uuid;
  v_obra      uuid;
  v_func      uuid;
  v_local     uuid;
  v_epi       uuid;
  v_qtd       integer;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_usuario;
  delete from usuario_obras where usuario_id = v_usuario;

  insert into obras (empresa_id, nome) values (v_empresa, 'Obra teste permissões') returning id into v_obra;
  insert into funcionarios (empresa_id, matricula, nome)
    values (v_empresa, 'TPC-' || left(gen_random_uuid()::text, 8), 'Funcionário teste permissões') returning id into v_func;
  insert into locais_estoque (empresa_id, nome) values (v_empresa, 'Local teste permissões') returning id into v_local;
  insert into epis (empresa_id, nome, ca, validade_ca)
    values (v_empresa, 'EPI teste permissões', 'CA-TPC-' || left(gen_random_uuid()::text, 8), current_date + 365)
    returning id into v_epi;
  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo) values (v_empresa, v_epi, v_local, 10);

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

  -- TESTE 1: a empresa tem o padrão de antes ------------------------
  begin
    execute format('select count(*) from permissoes_perfil where empresa_id = %L and acao not like ''aba\_%%''' /* abas: correção 20 */, v_empresa) into v_qtd;
    v_resultado := case when v_qtd = 3 then 'OK - 3 permissões padrão' else 'FALHOU - ' || v_qtd || ' permissões' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (padrão criado na empresa): ' || v_resultado;

  -- TESTE 2: empresa NOVA já nasce com o padrão ---------------------
  insert into empresas (razao_social, cnpj)
    values ('Empresa teste B', 'TESTE-' || left(gen_random_uuid()::text, 8)) returning id into v_empresa_b;
  begin
    execute format('select count(*) from permissoes_perfil where empresa_id = %L and acao not like ''aba\_%%''' /* abas: correção 20 */, v_empresa_b) into v_qtd;
    v_resultado := case when v_qtd = 3 then 'OK - nasceu com o padrão' else 'FALHOU - ' || v_qtd || ' permissões' end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (empresa nova com padrão): ' || v_resultado;

  -- Como ADMINISTRADOR: almoxarife perde "entregar"; gestor ganha "EPIs" e "ver todas as obras"
  execute 'set local role authenticated';
  begin
    execute 'select salvar_permissoes_perfil(''almoxarife'', array[''gerenciar_estoque''])';
    execute 'select salvar_permissoes_perfil(''gestor'', array[''gerenciar_epis'', ''ver_todas_obras''])';
  exception when others then
    v_relatorio := v_relatorio || E'\n(aviso: não salvou as caixinhas: ' || sqlerrm || ')';
  end;

  -- TESTE 3: almoxarife SEM "entregar" não entrega ------------------
  execute 'reset role';
  update usuarios set perfil = 'almoxarife' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    perform registrar_entrega(v_func, v_local,
      jsonb_build_array(jsonb_build_object('epi_id', v_epi, 'quantidade', 1)), null, 'confirmacao_responsavel', 'admissao');
    v_resultado := 'FALHOU - entregou sem a permissão';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (almoxarife sem "entregar"): ' || v_resultado;

  -- TESTE 4: almoxarife COM "estoque" ainda dá entrada --------------
  begin
    perform registrar_entrada_estoque(v_epi, v_local, 1);
    v_resultado := 'OK - deu entrada';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (almoxarife com "estoque"): ' || v_resultado;

  -- TESTE 5: gestor COM "EPIs" cadastra EPI -------------------------
  execute 'reset role';
  update usuarios set perfil = 'gestor' where id = v_usuario;
  execute 'set local role authenticated';
  begin
    insert into epis (empresa_id, nome, ca)
      values (v_empresa, 'EPI criado por gestor', 'CA-GES-' || left(gen_random_uuid()::text, 8));
    v_resultado := 'OK - cadastrou';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (gestor com "EPIs" cadastra EPI): ' || v_resultado;

  -- TESTE 6: gestor com "ver todas as obras" vê obra não liberada ---
  select count(*) into v_qtd from obras where id = v_obra;
  v_relatorio := v_relatorio || E'\nTESTE 6 (gestor com "ver todas as obras"): ' ||
    case when v_qtd = 1 then 'OK - vê' else 'FALHOU - não vê' end;

  -- TESTE 7: quem não é admin NÃO muda as caixinhas -----------------
  begin
    execute 'select salvar_permissoes_perfil(''gestor'', array[''registrar_entregas''])';
    v_resultado := 'FALHOU - gestor mudou as permissões';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (gestor muda as caixinhas): ' || v_resultado;

  -- Volta a ser ADMINISTRADOR -----------------------------------------
  execute 'reset role';
  update usuarios set perfil = 'administrador' where id = v_usuario;
  execute 'set local role authenticated';

  -- TESTE 8: perfil Administrador não é configurável ----------------
  begin
    execute 'select salvar_permissoes_perfil(''administrador'', array[]::text[])';
    v_resultado := 'FALHOU - aceitou mexer no Administrador';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função salvar_permissoes_perfil não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 8 (configurar o Administrador): ' || v_resultado;

  -- TESTE 9: admin NÃO grava direto na tabela (só pela função) ------
  begin
    execute format('insert into permissoes_perfil (empresa_id, perfil, acao) values (%L, %L, %L)',
                   v_empresa, 'gestor', 'gerenciar_obras');
    v_resultado := 'FALHOU - gravou direto na tabela';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 9 (gravar direto na tabela): ' || v_resultado;

  -- TESTE 10: "cadastrar obras" exige "ver todas as obras" ----------
  begin
    execute 'select salvar_permissoes_perfil(''gestor'', array[''gerenciar_obras''])';
    v_resultado := 'FALHOU - aceitou cadastrar obras sem ver todas';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função salvar_permissoes_perfil não existe';
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 10 (obras sem "ver todas"): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
