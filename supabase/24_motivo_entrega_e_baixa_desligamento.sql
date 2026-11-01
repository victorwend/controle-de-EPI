-- Motivo da entrega e baixa dos EPIs no desligamento — EPI-340.
--
-- Pedidos do Victor (01/11/2026):
--  1) Na entrega, informar o MOTIVO: admissão, troca, desgaste natural
--     ou perda.
--  2) No DESLIGAMENTO, dar baixa nos itens que a pessoa pegou (devolvido
--     ao estoque, descartado ou perdido) antes de inativar.
--  3) Poder registrar a devolução de quem já foi desligado.
--
-- O que esta correção faz:
--  A) entregas.motivo (obrigatório nas entregas novas).
--  B) registrar_entrega ganha o 6º parâmetro p_motivo.
--  C) Troca/devolução aceita o destino "perda" (perda/extravio: sai da
--     posse e NÃO volta para o estoque).
--  D) Funcionário inativo pode DEVOLVER, mas não TROCAR (troca é uma
--     entrega nova).
--  E) O banco não deixa inativar quem ainda tem EPI em posse.
--  F) Função desligar_funcionario: dá baixa em TUDO e inativa, numa
--     operação só (tudo ou nada).
--
-- Teste: tests/banco/teste_desligamento_baixa.sql (antes: 8x FALHOU; depois: 8x OK).
-- Os testes antigos que chamam registrar_entrega foram atualizados para
-- passar o motivo ('admissao'): rode-os DEPOIS desta correção.

-- =====================================================================
-- A) Motivo da entrega
-- =====================================================================
-- Entregas antigas ficam sem motivo (NULL = "não informado"): ninguém
-- sabe hoje qual foi, e o registro não pode inventar.
alter table entregas add column motivo text
  check (motivo in ('admissao', 'troca', 'desgaste', 'perda'));

-- =====================================================================
-- B) registrar_entrega com motivo
-- =====================================================================

drop function registrar_entrega(uuid, uuid, jsonb, text, text);
drop function interno.registrar_entrega(uuid, uuid, jsonb, text, text);

create function interno.registrar_entrega(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_itens jsonb,
  p_observacao text,
  p_aceite_metodo text,
  p_motivo text
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

  insert into entregas (empresa_id, funcionario_id, local_id, observacao, comprovante, aceite_metodo, motivo)
    values (v_empresa_id, p_funcionario_id, p_local_id, p_observacao, v_comprovante, p_aceite_metodo, p_motivo)
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

revoke execute on function interno.registrar_entrega(uuid, uuid, jsonb, text, text, text) from public, anon, authenticated;

-- Porteiro: igual ao da correção 19, mais a conferência do motivo.
create function registrar_entrega(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_itens jsonb,
  p_observacao text,
  p_aceite_metodo text,
  p_motivo text
)
returns text
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_permissao('registrar_entregas');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  perform interno.exigir_local_da_empresa(p_local_id);
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));

  -- RN-050 / RN-051: a entrega só é concluída com um método de aceite real.
  if p_aceite_metodo is null or not (p_aceite_metodo = any (interno.metodos_aceite_habilitados())) then
    raise exception 'Método de aceite "%" não está habilitado. Use: %.',
      coalesce(p_aceite_metodo, 'vazio'), array_to_string(interno.metodos_aceite_habilitados(), ', ')
      using errcode = 'P0001';
  end if;

  -- EPI-340: motivo obrigatório.
  if p_motivo is null or p_motivo not in ('admissao', 'troca', 'desgaste', 'perda') then
    raise exception 'Informe o motivo da entrega: admissão, troca, desgaste natural ou perda.' using errcode = 'P0001';
  end if;

  -- RN-019 / RN-044: funcionário inativo não recebe nova entrega.
  if exists (select 1 from funcionarios where id = p_funcionario_id and status <> 'ativo') then
    raise exception 'Funcionário inativo não pode receber EPI.' using errcode = 'P0001';
  end if;

  return interno.registrar_entrega(p_funcionario_id, p_local_id, p_itens, p_observacao, p_aceite_metodo, p_motivo);
end;
$$;

revoke execute on function registrar_entrega(uuid, uuid, jsonb, text, text, text) from public, anon;
grant execute on function registrar_entrega(uuid, uuid, jsonb, text, text, text) to authenticated;

-- =====================================================================
-- C) Destino "perda" na troca/devolução
-- =====================================================================

alter table trocas_devolucoes_itens drop constraint trocas_devolucoes_itens_destino_check;
alter table trocas_devolucoes_itens add constraint trocas_devolucoes_itens_destino_check
  check (destino in ('estoque', 'descarte', 'perda'));

-- Mesma lógica da correção 08; muda só a lista de destinos aceitos.
-- "perda" se comporta como "descarte" no estoque (não volta), mas fica
-- registrado que o EPI foi PERDIDO/EXTRAVIADO.
create or replace function interno.registrar_troca_devolucao(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_motivo text,
  p_itens jsonb
)
returns void
language plpgsql set search_path = public as $$
declare
  v_empresa_id uuid := empresa_atual();
  v_item jsonb;
  v_epi_id uuid;
  v_quantidade integer;
  v_acao text;
  v_destino text;
  v_posse_atual integer;
  v_saldo_reposicao integer;
begin
  if jsonb_array_length(p_itens) = 0 then
    raise exception 'Selecione ao menos um item.';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_epi_id := (v_item ->> 'epi_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;
    v_acao := v_item ->> 'acao';
    v_destino := v_item ->> 'destino';

    if v_acao not in ('troca', 'devolucao') then
      raise exception 'Ação inválida.';
    end if;
    if v_destino not in ('estoque', 'descarte', 'perda') then
      raise exception 'Destino inválido.';
    end if;
    if v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Quantidade deve ser maior que zero.';
    end if;
    if v_destino = 'estoque' and p_local_id is null then
      raise exception 'Escolha o local de estoque que vai receber o EPI devolvido.';
    end if;

    select quantidade into v_posse_atual
      from posse_epi_funcionario
      where funcionario_id = p_funcionario_id and epi_id = v_epi_id;

    if coalesce(v_posse_atual, 0) < v_quantidade then
      raise exception 'O funcionário não tem essa quantidade em posse.';
    end if;

    if v_acao = 'troca' then
      select saldo into v_saldo_reposicao
        from saldo_estoque
        where epi_id = v_epi_id and local_id = p_local_id;

      if coalesce(v_saldo_reposicao, 0) < v_quantidade then
        raise exception 'Saldo insuficiente para repor a troca.';
      end if;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_epi_id := (v_item ->> 'epi_id')::uuid;
    v_quantidade := (v_item ->> 'quantidade')::integer;
    v_acao := v_item ->> 'acao';
    v_destino := v_item ->> 'destino';

    insert into trocas_devolucoes_itens (empresa_id, funcionario_id, epi_id, quantidade, acao, destino, motivo)
      values (v_empresa_id, p_funcionario_id, v_epi_id, v_quantidade, v_acao, v_destino, p_motivo);

    update posse_epi_funcionario
      set quantidade = quantidade - v_quantidade, atualizado_em = now()
      where funcionario_id = p_funcionario_id and epi_id = v_epi_id;

    if v_destino = 'estoque' then
      insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
        values (v_empresa_id, v_epi_id, p_local_id, v_quantidade)
      on conflict (epi_id, local_id) do update
        set saldo = saldo_estoque.saldo + excluded.saldo, atualizado_em = now();

      insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_destino_id, quantidade, observacao)
        values (
          v_empresa_id, 'entrada', v_epi_id, p_local_id, v_quantidade,
          case when v_acao = 'troca' then 'Troca — devolução ao estoque' else 'Devolução ao estoque' end
        );
    end if;

    if v_acao = 'troca' then
      update saldo_estoque
        set saldo = saldo - v_quantidade, atualizado_em = now()
        where epi_id = v_epi_id and local_id = p_local_id;

      insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_origem_id, quantidade, observacao)
        values (v_empresa_id, 'saida', v_epi_id, p_local_id, v_quantidade, 'Troca — reposição');

      insert into posse_epi_funcionario (empresa_id, funcionario_id, epi_id, quantidade)
        values (v_empresa_id, p_funcionario_id, v_epi_id, v_quantidade)
      on conflict (funcionario_id, epi_id) do update
        set quantidade = posse_epi_funcionario.quantidade + excluded.quantidade, atualizado_em = now();
    end if;
  end loop;
end;
$$;

-- =====================================================================
-- D) Porteiro da troca/devolução: inativo só DEVOLVE
-- =====================================================================

create or replace function registrar_troca_devolucao(
  p_funcionario_id uuid, p_local_id uuid, p_motivo text, p_itens jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_permissao('registrar_entregas');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  if p_local_id is not null then
    perform interno.exigir_local_da_empresa(p_local_id);
  end if;
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));

  -- EPI-340: quem já foi desligado pode DEVOLVER o que ficou com ele,
  -- mas não pode receber nada novo (a troca entrega uma unidade nova).
  if exists (select 1 from funcionarios where id = p_funcionario_id and status <> 'ativo')
     and exists (select 1 from jsonb_array_elements(p_itens) as item where item ->> 'acao' = 'troca') then
    raise exception 'Funcionário inativo só pode devolver EPI, não trocar.' using errcode = 'P0001';
  end if;

  perform interno.registrar_troca_devolucao(p_funcionario_id, p_local_id, p_motivo, p_itens);
end;
$$;

-- =====================================================================
-- E) Não inativa quem ainda tem EPI em posse
-- =====================================================================

create function interno.exigir_baixa_ao_desligar()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'inativo' and old.status = 'ativo'
     and exists (select 1 from posse_epi_funcionario where funcionario_id = new.id and quantidade > 0) then
    raise exception 'Antes de desligar, dê baixa nos EPIs que estão com o funcionário (devolvido, descartado ou perdido).';
  end if;
  return new;
end;
$$;

create trigger exigir_baixa_ao_desligar
  before update of status on funcionarios
  for each row execute function interno.exigir_baixa_ao_desligar();

-- =====================================================================
-- F) Desligar: baixa de TUDO + inativar (tudo ou nada)
-- =====================================================================
-- p_itens: [{ "epi_id": "...", "quantidade": 1, "destino": "estoque" | "descarte" | "perda" }]
-- Precisa cobrir TODO o EPI em posse. p_local_id: para onde vai o que
-- volta ao estoque (pode ser nulo se nada voltar).

create function desligar_funcionario(
  p_funcionario_id uuid,
  p_data date,
  p_motivo text,
  p_local_id uuid,
  p_itens jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_itens jsonb := coalesce(p_itens, '[]'::jsonb);
begin
  perform exigir_permissao('gerenciar_funcionarios');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);

  if exists (select 1 from funcionarios where id = p_funcionario_id and status <> 'ativo') then
    raise exception 'Este funcionário já está inativo.';
  end if;
  if p_data is null or p_data > current_date then
    raise exception 'A data do desligamento não pode ser no futuro.';
  end if;
  if nullif(btrim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Informe o motivo do desligamento.';
  end if;

  if jsonb_array_length(v_itens) > 0 then
    if p_local_id is not null then
      perform interno.exigir_local_da_empresa(p_local_id);
    end if;
    perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(v_itens));
    -- Toda baixa de desligamento é DEVOLUÇÃO (nada novo é entregue).
    perform interno.registrar_troca_devolucao(
      p_funcionario_id, p_local_id, 'Desligamento: ' || btrim(p_motivo),
      (select jsonb_agg(item || jsonb_build_object('acao', 'devolucao')) from jsonb_array_elements(v_itens) as item)
    );
  end if;

  -- O gatilho do item E recusa se ainda sobrar EPI em posse.
  update funcionarios
     set status = 'inativo', data_desligamento = p_data, motivo_desligamento = btrim(p_motivo)
   where id = p_funcionario_id;
end;
$$;

revoke execute on function desligar_funcionario(uuid, date, text, uuid, jsonb) from public, anon;
grant execute on function desligar_funcionario(uuid, date, text, uuid, jsonb) to authenticated;
