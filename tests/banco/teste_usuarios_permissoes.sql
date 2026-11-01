-- =============================================================
-- TESTE DE USUÁRIOS E PERMISSÕES — EPI360 (EPI-329)
-- Não altera nada: no final, tudo é desfeito de propósito.
-- O resultado aparece como uma mensagem de ERRO vermelha
-- começando com "RESULTADO DOS TESTES". Isso é esperado.
--
-- Cenário: o 1º usuário da empresa é o ADMINISTRADOR. O teste cria
-- um segundo usuário ("Usuário teste") e duas obras, e confere as
-- regras de gerenciamento de usuários (perfil + obras + situação).
--
-- Esperado ANTES da correção 17: testes 1, 2, 3, 4, 5, 7, 8 e 10 FALHOU.
-- Esperado DEPOIS da correção 17: todos OK.
-- =============================================================
do $$
declare
  v_admin     uuid;
  v_empresa   uuid;
  v_outro     uuid := gen_random_uuid();
  v_obra1     uuid;
  v_obra2     uuid;
  v_empresa_b uuid;
  v_obra_b    uuid;
  v_perfil    text;
  v_qtd       integer;
  v_resultado text;
  v_relatorio text := '';
begin
  -- Preparação (dono do banco, sem RLS) -----------------------------
  select id, empresa_id into v_admin, v_empresa from usuarios order by created_at limit 1;
  if v_admin is null then
    raise exception 'Nenhum usuário encontrado na tabela usuarios. Cadastre uma empresa pelo sistema primeiro.';
  end if;
  update usuarios set perfil = 'administrador', status = 'ativo' where id = v_admin;

  insert into auth.users (id, email) values (v_outro, 'teste-' || left(v_outro::text, 8) || '@teste.local');
  insert into usuarios (id, empresa_id, nome_completo, email, perfil)
    values (v_outro, v_empresa, 'Usuário teste', 'teste-' || left(v_outro::text, 8) || '@teste.local', 'almoxarife');
  insert into obras (empresa_id, nome) values (v_empresa, 'Obra teste P1') returning id into v_obra1;
  insert into obras (empresa_id, nome) values (v_empresa, 'Obra teste P2') returning id into v_obra2;

  insert into empresas (razao_social, cnpj)
    values ('Empresa teste B', 'TESTE-' || left(gen_random_uuid()::text, 8)) returning id into v_empresa_b;
  insert into obras (empresa_id, nome) values (v_empresa_b, 'Obra da empresa B') returning id into v_obra_b;

  -- Entra no sistema como o ADMINISTRADOR ----------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- TESTE 1: admin muda o perfil e libera duas obras -----------------
  begin
    perform atualizar_permissoes_usuario(v_outro, 'gestor', true, array[v_obra1, v_obra2]);
    select perfil::text into v_perfil from usuarios where id = v_outro;
    select count(*) into v_qtd from usuario_obras where usuario_id = v_outro;
    v_resultado := case when v_perfil = 'gestor' and v_qtd = 2 then 'OK - perfil gestor e 2 obras'
                        else 'FALHOU - perfil ' || coalesce(v_perfil, '?') || ', obras ' || v_qtd end;
  exception
    when undefined_function then v_resultado := 'FALHOU - a função atualizar_permissoes_usuario não existe';
    when others then v_resultado := 'FALHOU - erro: ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 1 (admin muda perfil e libera obras): ' || v_resultado;

  -- TESTE 2: admin tira uma obra --------------------------------------
  begin
    perform atualizar_permissoes_usuario(v_outro, 'gestor', true, array[v_obra1]);
    select count(*) into v_qtd from usuario_obras where usuario_id = v_outro;
    v_resultado := case when v_qtd = 1 then 'OK - ficou só 1 obra' else 'FALHOU - ficaram ' || v_qtd || ' obras' end;
  exception
    when undefined_function then v_resultado := 'FALHOU - a função atualizar_permissoes_usuario não existe';
    when others then v_resultado := 'FALHOU - erro: ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 2 (admin tira uma obra): ' || v_resultado;

  -- TESTE 3: admin NÃO inativa o próprio acesso -----------------------
  begin
    update usuarios set status = 'inativo' where id = v_admin;
    v_resultado := 'FALHOU - o admin inativou a si mesmo';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 3 (admin inativa a si mesmo): ' || v_resultado;

  -- TESTE 4: perfil Operador não pode mais ser usado ------------------
  begin
    update usuarios set perfil = 'operador' where id = v_outro;
    v_resultado := 'FALHOU - aceitou o perfil Operador';
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 4 (dar o perfil Operador): ' || v_resultado;

  -- TESTE 5: usuário INATIVO perde o acesso (RN-013) ------------------
  execute 'reset role';
  update usuarios set status = 'inativo' where id = v_outro;
  perform set_config('request.jwt.claims', json_build_object('sub', v_outro, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select perfil_atual()::text into v_perfil;
  select count(*) into v_qtd from obras;
  v_relatorio := v_relatorio || E'\nTESTE 5 (usuário inativo perde acesso): ' ||
    case when v_perfil is null and v_qtd = 0 then 'OK - sem perfil e sem dados'
         else 'FALHOU - perfil ' || coalesce(v_perfil, 'nenhum') || ', vê ' || v_qtd || ' obras' end;

  -- TESTE 6: usuário inativo ainda vê o PRÓPRIO cadastro --------------
  -- (assim a tela consegue avisar "seu acesso está inativo")
  select count(*) into v_qtd from usuarios where id = v_outro;
  v_relatorio := v_relatorio || E'\nTESTE 6 (inativo vê o próprio cadastro): ' ||
    case when v_qtd = 1 then 'OK - vê' else 'FALHOU - não vê' end;

  -- TESTE 7: quem não é admin NÃO muda permissões ---------------------
  execute 'reset role';
  update usuarios set status = 'ativo' where id = v_outro;
  execute 'set local role authenticated';
  begin
    perform atualizar_permissoes_usuario(v_admin, 'gestor', true, array[]::uuid[]);
    v_resultado := 'FALHOU - um gestor mudou as permissões do admin';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função atualizar_permissoes_usuario não existe';
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 7 (gestor muda permissões): ' || v_resultado;

  -- Volta a ser o ADMINISTRADOR ---------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- TESTE 8: usuário não é EXCLUÍDO, só inativado ---------------------
  begin
    delete from usuarios where id = v_outro;
    get diagnostics v_qtd = row_count;
    v_resultado := case when v_qtd = 0 then 'FALHOU - não excluiu, mas também não avisou'
                        else 'FALHOU - o usuário foi excluído' end;
    raise exception using errcode = 'ZZ001';
  exception
    when sqlstate 'ZZ001' then null;
    when others then v_resultado := 'OK - o banco recusou';
  end;
  v_relatorio := v_relatorio || E'\nTESTE 8 (excluir usuário): ' || v_resultado;

  -- TESTE 9: não sobrou nenhum Operador ATIVO -------------------------
  execute 'reset role';
  select count(*) into v_qtd from usuarios where perfil = 'operador' and status = 'ativo';
  v_relatorio := v_relatorio || E'\nTESTE 9 (operadores ativos): ' ||
    case when v_qtd = 0 then 'OK - nenhum' else 'FALHOU - ainda há ' || v_qtd end;
  execute 'set local role authenticated';

  -- TESTE 10: admin NÃO libera obra de outra empresa ------------------
  begin
    perform atualizar_permissoes_usuario(v_outro, 'gestor', true, array[v_obra_b]);
    v_resultado := 'FALHOU - liberou obra de outra empresa';
    raise exception using errcode = 'ZZ001';
  exception
    when insufficient_privilege then v_resultado := 'OK - o banco recusou';
    when sqlstate 'ZZ001' then null;
    when undefined_function then v_resultado := 'FALHOU - a função atualizar_permissoes_usuario não existe';
    when others then v_resultado := 'ERRO NO TESTE - ' || sqlerrm;
  end;
  v_relatorio := v_relatorio || E'\nTESTE 10 (liberar obra de outra empresa): ' || v_resultado;

  execute 'reset role';

  -- Desfaz TUDO (usuário teste, obras, empresa B) ---------------------
  raise exception 'RESULTADO DOS TESTES:%', v_relatorio;
end;
$$;
