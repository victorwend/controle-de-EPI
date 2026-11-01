-- =============================================================
-- TESTE DAS ABAS LIBERADAS POR PERFIL — EPI360 (EPI-333)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Esperado ANTES da correção 20: testes 1, 2, 3 e 5 FALHOU.
-- Esperado DEPOIS da correção 20: todos OK.
-- =============================================================
do $$
declare
  v_usuario   uuid;
  v_empresa   uuid;
  v_empresa_b uuid;
  v_qtd       integer;
  v_texto     text;
  v_resultado text;
  v_relatorio text := '';
begin
  select id, empresa_id into v_usuario, v_empresa from usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_usuario;

  -- TESTE 1: empresa que já existia ganhou as 7 abas para os 3 perfis --
  select count(*) into v_qtd from permissoes_perfil where empresa_id = v_empresa and acao like 'aba\_%';
  v_relatorio := v_relatorio || E'\nTESTE 1 (abas liberadas na empresa existente): ' ||
    case when v_qtd = 21 then 'OK - 21 (7 abas x 3 perfis)' else 'FALHOU - ' || v_qtd end;

  -- TESTE 2: empresa NOVA já nasce com as abas liberadas -------------
  insert into empresas (razao_social, cnpj)
    values ('Empresa teste abas', 'TESTE-' || left(gen_random_uuid()::text, 8)) returning id into v_empresa_b;
  select count(*) into v_qtd from permissoes_perfil where empresa_id = v_empresa_b and acao like 'aba\_%';
  v_relatorio := v_relatorio || E'\nTESTE 2 (empresa nova com as abas): ' ||
    case when v_qtd = 21 then 'OK - 21' else 'FALHOU - ' || v_qtd end;

  perform set_config('request.jwt.claims', json_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 3: dar "entregar" sem a aba Entregas libera a aba junto ----
  begin
    perform salvar_permissoes_perfil('gestor', array['registrar_entregas']);
    select string_agg(acao, ',' order by acao) into v_texto
      from permissoes_perfil where empresa_id = v_empresa and perfil = 'gestor';
    v_resultado := case when v_texto = 'aba_entregas,registrar_entregas' then 'OK - ' || v_texto
                        else 'FALHOU - ficou: ' || coalesce(v_texto, 'nada') end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (ação libera a sua aba): ' || v_resultado;

  -- TESTE 4: tirar todas as abas do gestor (só Visão geral) ----------
  begin
    perform salvar_permissoes_perfil('gestor', array[]::text[]);
    select count(*) into v_qtd from permissoes_perfil where empresa_id = v_empresa and perfil = 'gestor';
    v_resultado := case when v_qtd = 0 then 'OK - sem nenhuma aba' else 'FALHOU - ' || v_qtd end;
  exception when others then
    v_resultado := 'FALHOU - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (perfil sem nenhuma aba): ' || v_resultado;

  -- TESTE 5: aba com nome desconhecido é recusada --------------------
  begin
    perform salvar_permissoes_perfil('gestor', array['aba_relatorios']);
    begin
      perform salvar_permissoes_perfil('gestor', array['aba_inventada']);
      v_resultado := 'FALHOU - aceitou aba inventada';
    exception when others then
      v_resultado := 'OK - aceitou aba_relatorios e recusou aba inventada';
    end;
  exception when others then
    v_resultado := 'FALHOU - recusou aba_relatorios: ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 5 (abas válidas e inválidas): ' || v_resultado;

  execute 'reset role';
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
