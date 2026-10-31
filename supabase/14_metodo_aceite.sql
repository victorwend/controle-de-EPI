-- Método real de aceite da entrega — EPI-273 (decisão do Victor em 31/10/2026).
--
-- Problema: toda entrega era gravada com aceite_metodo = 'biometria'
-- (valor padrão da coluna), mas a biometria é só uma simulação na tela.
-- A ficha de EPI afirmava algo que não aconteceu. Além disso, um
-- funcionário sem biometria cadastrada não conseguia receber EPI.
--
-- Decisão do Victor: enquanto a biometria não for real (RN-062), a entrega
-- é concluída com um BOTÃO DE CONFIRMAÇÃO do responsável pela entrega
-- ("confirmacao_responsavel"). O sistema registra QUEM confirmou e QUANDO
-- (responsavel_usuario_id, created_at). Opcionalmente, o termo pode ser
-- impresso e assinado à mão ("assinatura_papel").
-- No computador não dá para assinar na tela; a assinatura na tela
-- (tablet/celular) e a biometria ficam para quando forem habilitadas.
--
-- O que esta correção faz:
--  A) aceite_metodo deixa de ter padrão e só aceita valores conhecidos;
--     entregas antigas gravadas como 'biometria' viram 'simulado'.
--  B) registrar_entrega passa a EXIGIR o método (RN-050, RN-051) e só
--     aceita métodos habilitados. Hoje: 'confirmacao_responsavel' e
--     'assinatura_papel'.
--  C) registrar_entrega recusa funcionário inativo (RN-019, RN-044).
--
-- Para habilitar outro método no futuro, inclua-o na lista do item B
-- (função interno.metodos_aceite_habilitados).
--
-- Teste: tests/banco/teste_aceite.sql (antes: 5x FALHOU; depois: 5x OK).
-- Os testes antigos que chamam registrar_entrega foram atualizados para
-- passar o método (rodar depois desta correção).

-- =====================================================================
-- A) Coluna aceite_metodo
-- =====================================================================

update entregas set aceite_metodo = 'simulado' where aceite_metodo = 'biometria';

alter table entregas alter column aceite_metodo drop default;

alter table entregas
  add constraint entregas_aceite_metodo_check
  check (aceite_metodo in ('confirmacao_responsavel', 'assinatura_papel', 'assinatura_tela', 'biometria', 'simulado'));

comment on column entregas.aceite_metodo is
  'Como o recebimento foi confirmado: confirmacao_responsavel (botão do responsável), assinatura_papel (termo impresso), assinatura_tela, biometria, ou simulado (entregas antigas, antes da EPI-273).';

-- =====================================================================
-- B) Métodos habilitados
-- =====================================================================

create function interno.metodos_aceite_habilitados()
returns text[]
language sql immutable as $$
  select array['confirmacao_responsavel', 'assinatura_papel']::text[];
$$;

revoke execute on function interno.metodos_aceite_habilitados() from public, anon, authenticated;

-- =====================================================================
-- Função original (interno) recriada com o método de aceite
-- =====================================================================
-- Mesma lógica da versão da correção 08 (validar saldo de todos os itens,
-- gravar entrega + itens, baixar saldo, gerar movimentação e posse),
-- agora gravando aceite_metodo.

drop function interno.registrar_entrega(uuid, uuid, jsonb, text);

create function interno.registrar_entrega(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_itens jsonb,
  p_observacao text,
  p_aceite_metodo text
)
returns text
language plpgsql set search_path = public as $$
declare
  v_empresa_id uuid := empresa_atual();
  v_entrega_id uuid;
  v_comprovante text;
  v_item jsonb;
  v_epi_id uuid;
  v_quantidade integer;
  v_saldo_atual integer;
begin
  if jsonb_array_length(p_itens) = 0 then
    raise exception 'A entrega precisa ter pelo menos um item.';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_epi_id := (v_item ->> 'epi_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    if v_quantidade <= 0 then
      raise exception 'Quantidade deve ser maior que zero.';
    end if;

    select saldo into v_saldo_atual
      from saldo_estoque
      where epi_id = v_epi_id and local_id = p_local_id;

    if coalesce(v_saldo_atual, 0) < v_quantidade then
      raise exception 'Saldo insuficiente para um dos itens selecionados.';
    end if;
  end loop;

  v_comprovante := 'EPI-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into entregas (empresa_id, funcionario_id, local_id, observacao, comprovante, aceite_metodo)
    values (v_empresa_id, p_funcionario_id, p_local_id, p_observacao, v_comprovante, p_aceite_metodo)
    returning id into v_entrega_id;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_epi_id := (v_item ->> 'epi_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;

    insert into entrega_itens (entrega_id, epi_id, quantidade)
      values (v_entrega_id, v_epi_id, v_quantidade);

    update saldo_estoque
      set saldo = saldo - v_quantidade, atualizado_em = now()
      where epi_id = v_epi_id and local_id = p_local_id;

    insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_origem_id, quantidade, observacao)
      values (v_empresa_id, 'saida', v_epi_id, p_local_id, v_quantidade, 'Entrega ' || v_comprovante);

    insert into posse_epi_funcionario (empresa_id, funcionario_id, epi_id, quantidade)
      values (v_empresa_id, p_funcionario_id, v_epi_id, v_quantidade)
    on conflict (funcionario_id, epi_id) do update
      set quantidade = posse_epi_funcionario.quantidade + excluded.quantidade, atualizado_em = now();
  end loop;

  return v_comprovante;
end;
$$;

revoke execute on function interno.registrar_entrega(uuid, uuid, jsonb, text, text) from public, anon, authenticated;

-- =====================================================================
-- Porteiro com o método de aceite (substitui o de 4 parâmetros)
-- =====================================================================

drop function registrar_entrega(uuid, uuid, jsonb, text);

create function registrar_entrega(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_itens jsonb,
  p_observacao text,
  p_aceite_metodo text
)
returns text
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  perform interno.exigir_local_da_empresa(p_local_id);
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));

  -- RN-050 / RN-051: a entrega só é concluída com um método de aceite real.
  if p_aceite_metodo is null or not (p_aceite_metodo = any (interno.metodos_aceite_habilitados())) then
    raise exception 'Método de aceite "%" não está habilitado. Use: %.',
      coalesce(p_aceite_metodo, 'vazio'), array_to_string(interno.metodos_aceite_habilitados(), ', ')
      using errcode = 'P0001';
  end if;

  -- RN-019 / RN-044: funcionário inativo não recebe nova entrega.
  if exists (select 1 from funcionarios where id = p_funcionario_id and status <> 'ativo') then
    raise exception 'Funcionário inativo não pode receber EPI.' using errcode = 'P0001';
  end if;

  return interno.registrar_entrega(p_funcionario_id, p_local_id, p_itens, p_observacao, p_aceite_metodo);
end;
$$;

revoke execute on function registrar_entrega(uuid, uuid, jsonb, text, text) from public, anon;
grant execute on function registrar_entrega(uuid, uuid, jsonb, text, text) to authenticated;
