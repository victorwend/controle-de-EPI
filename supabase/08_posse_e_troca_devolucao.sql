-- Sprint 9 — Troca e devolução (real) + a "posse" que sustenta essa tela:
-- quanto de cada EPI um funcionário tem em mãos agora, derivado das entregas
-- (crédito) e das trocas/devoluções (débito). Espelha o mesmo padrão de
-- saldo_estoque — nunca escrito direto pelo cliente, só pelas funções.

create table posse_epi_funcionario (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  epi_id uuid not null references epis(id) on delete cascade,
  quantidade integer not null default 0 check (quantidade >= 0),
  atualizado_em timestamptz not null default now(),
  unique (funcionario_id, epi_id)
);

create index posse_epi_funcionario_empresa_id_idx on posse_epi_funcionario (empresa_id);

alter table posse_epi_funcionario enable row level security;

create policy "posse: select da mesma empresa"
  on posse_epi_funcionario for select
  using (empresa_id = empresa_atual());

create policy "posse: almoxarife e administrador gerenciam"
  on posse_epi_funcionario for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

-- Recria registrar_entrega() (mesma assinatura) só para também creditar a
-- posse do funcionário a cada item entregue.
create or replace function registrar_entrega(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_itens jsonb,
  p_observacao text default null
)
returns text
language plpgsql as $$
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

  insert into entregas (empresa_id, funcionario_id, local_id, observacao, comprovante)
    values (v_empresa_id, p_funcionario_id, p_local_id, p_observacao, v_comprovante)
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

create table trocas_devolucoes_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  epi_id uuid not null references epis(id),
  quantidade integer not null check (quantidade > 0),
  acao text not null check (acao in ('troca', 'devolucao')),
  destino text not null check (destino in ('estoque', 'descarte')),
  motivo text,
  responsavel_usuario_id uuid not null references usuarios(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index trocas_devolucoes_itens_empresa_id_idx on trocas_devolucoes_itens (empresa_id);
create index trocas_devolucoes_itens_funcionario_id_idx on trocas_devolucoes_itens (funcionario_id);

alter table trocas_devolucoes_itens enable row level security;

create policy "trocas_devolucoes_itens: select da mesma empresa"
  on trocas_devolucoes_itens for select
  using (empresa_id = empresa_atual());

create policy "trocas_devolucoes_itens: almoxarife e administrador gerenciam"
  on trocas_devolucoes_itens for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

-- Registra troca/devolução de vários itens de uma vez. Devolução: o item
-- sai da posse e vai pro destino escolhido (estoque volta pro saldo,
-- descarte não). Troca: além disso, uma nova unidade do MESMO EPI é
-- reentregue na hora (mesma leitura do Figma: "devolvido → destino, nova
-- unidade entregue") — debita saldo de novo e credita a posse de volta.
-- Valida posse e saldo de reposição de TODOS os itens antes de gravar
-- qualquer coisa (mesmo padrão de registrar_entrega).
create function registrar_troca_devolucao(
  p_funcionario_id uuid,
  p_local_id uuid,
  p_motivo text,
  p_itens jsonb
)
returns void
language plpgsql as $$
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
    if v_destino not in ('estoque', 'descarte') then
      raise exception 'Destino inválido.';
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
