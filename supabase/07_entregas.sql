-- Sprint 8 — Entrega individual (real). Biometria continua sendo só uma
-- simulação de UI (não existe leitor biométrico de verdade integrado) — nada
-- da simulação é persistido; o que entra no banco é só o resultado final:
-- a entrega concluída, os itens entregues e a baixa correspondente no
-- estoque, tudo numa operação atômica (registrar_entrega).
--
-- Fora de escopo desta fatia, ainda mock: Troca/devolução (03.08) e Entrega
-- em lote (03.07) — só a entrega individual (03.02→03.04) foi migrada.

alter table movimentacoes_estoque drop constraint movimentacoes_estoque_tipo_check;
alter table movimentacoes_estoque add constraint movimentacoes_estoque_tipo_check
  check (tipo in ('entrada', 'transferencia', 'saida'));

create table entregas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  local_id uuid not null references locais_estoque(id),
  observacao text,
  aceite_metodo text not null default 'biometria',
  comprovante text not null,
  status text not null default 'confirmada' check (status in ('confirmada', 'pendente')),
  responsavel_usuario_id uuid not null references usuarios(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index entregas_empresa_id_idx on entregas (empresa_id);
create index entregas_funcionario_id_idx on entregas (funcionario_id);

create table entrega_itens (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references entregas(id) on delete cascade,
  epi_id uuid not null references epis(id),
  quantidade integer not null check (quantidade > 0)
);

create index entrega_itens_entrega_id_idx on entrega_itens (entrega_id);

alter table entregas enable row level security;
alter table entrega_itens enable row level security;

create policy "entregas: select da mesma empresa"
  on entregas for select
  using (empresa_id = empresa_atual());

create policy "entregas: almoxarife e administrador gerenciam"
  on entregas for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

create policy "entrega_itens: select da mesma empresa"
  on entrega_itens for select
  using (exists (select 1 from entregas e where e.id = entrega_itens.entrega_id and e.empresa_id = empresa_atual()));

create policy "entrega_itens: almoxarife e administrador gerenciam"
  on entrega_itens for all
  using (
    perfil_atual() in ('administrador', 'almoxarife')
    and exists (select 1 from entregas e where e.id = entrega_itens.entrega_id and e.empresa_id = empresa_atual())
  );

-- Registra a entrega inteira (cabeçalho + itens) e debita o saldo de cada
-- item na mesma operação. Valida saldo de TODOS os itens antes de gravar
-- qualquer coisa (RN053/RN055) — não faz baixa parcial.
create function registrar_entrega(
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
  end loop;

  return v_comprovante;
end;
$$;
