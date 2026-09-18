-- Sprint 7 — Estoque (real): locais, saldo e movimentações (entrada e
-- transferência). RN041 (saldo por EPI/CA/obra/local), RN044 (entrada com
-- item, CA, quantidade, origem, documento, local, responsável) e RN047
-- (ajuste exige motivo e permissão — ainda não implementado, não existe
-- tela de ajuste manual nesta fatia).
--
-- Saldo nunca é escrito direto pelo cliente: só as funções abaixo
-- (registrar_entrada_estoque / transferir_estoque) escrevem em
-- saldo_estoque, sempre em conjunto com a movimentação que o gerou —
-- evita saldo "solto" sem rastro de como chegou lá.
--
-- Catálogo de perfis (10.03): "Almoxarife" cuida de "Estoque e entregas" —
-- então ele gerencia estas 3 tabelas junto com o Administrador, diferente
-- de obras/funcionarios (só admin) e igual ao espírito de epis (admin +
-- perfil específico do módulo).

create table locais_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  codigo text,
  obra_id uuid references obras(id) on delete set null,
  responsavel_id uuid references funcionarios(id) on delete set null,
  permite_transferencia boolean not null default true,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create unique index locais_estoque_empresa_codigo_key
  on locais_estoque (empresa_id, codigo)
  where codigo is not null;
create index locais_estoque_empresa_id_idx on locais_estoque (empresa_id);

create table saldo_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  epi_id uuid not null references epis(id) on delete cascade,
  local_id uuid not null references locais_estoque(id) on delete cascade,
  saldo integer not null default 0 check (saldo >= 0),
  atualizado_em timestamptz not null default now(),
  unique (epi_id, local_id)
);

create index saldo_estoque_empresa_id_idx on saldo_estoque (empresa_id);

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'transferencia')),
  epi_id uuid not null references epis(id) on delete cascade,
  local_origem_id uuid references locais_estoque(id) on delete set null,
  local_destino_id uuid references locais_estoque(id) on delete set null,
  quantidade integer not null check (quantidade > 0),
  documento text,
  fornecedor text,
  observacao text,
  responsavel_usuario_id uuid not null references usuarios(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index movimentacoes_estoque_empresa_id_idx on movimentacoes_estoque (empresa_id);
create index movimentacoes_estoque_created_at_idx on movimentacoes_estoque (created_at desc);

alter table locais_estoque enable row level security;
alter table saldo_estoque enable row level security;
alter table movimentacoes_estoque enable row level security;

create policy "locais_estoque: select da mesma empresa"
  on locais_estoque for select
  using (empresa_id = empresa_atual());

create policy "locais_estoque: almoxarife e administrador gerenciam"
  on locais_estoque for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

create policy "saldo_estoque: select da mesma empresa"
  on saldo_estoque for select
  using (empresa_id = empresa_atual());

create policy "saldo_estoque: almoxarife e administrador gerenciam"
  on saldo_estoque for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

create policy "movimentacoes_estoque: select da mesma empresa"
  on movimentacoes_estoque for select
  using (empresa_id = empresa_atual());

create policy "movimentacoes_estoque: almoxarife e administrador gerenciam"
  on movimentacoes_estoque for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual());

-- Registra a entrada e credita o saldo do local de destino numa só operação.
create function registrar_entrada_estoque(
  p_epi_id uuid,
  p_local_id uuid,
  p_quantidade integer,
  p_documento text default null,
  p_fornecedor text default null,
  p_observacao text default null
)
returns uuid
language plpgsql as $$
declare
  v_empresa_id uuid := empresa_atual();
  v_movimentacao_id uuid;
begin
  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_destino_id, quantidade, documento, fornecedor, observacao)
    values (v_empresa_id, 'entrada', p_epi_id, p_local_id, p_quantidade, p_documento, p_fornecedor, p_observacao)
    returning id into v_movimentacao_id;

  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
    values (v_empresa_id, p_epi_id, p_local_id, p_quantidade)
  on conflict (epi_id, local_id) do update
    set saldo = saldo_estoque.saldo + excluded.saldo, atualizado_em = now();

  return v_movimentacao_id;
end;
$$;

-- Registra a transferência, debita a origem e credita o destino na mesma
-- operação. Bloqueia se a origem não tiver saldo suficiente (RN041).
create function transferir_estoque(
  p_epi_id uuid,
  p_local_origem_id uuid,
  p_local_destino_id uuid,
  p_quantidade integer,
  p_documento text default null,
  p_observacao text default null
)
returns uuid
language plpgsql as $$
declare
  v_empresa_id uuid := empresa_atual();
  v_saldo_origem integer;
  v_movimentacao_id uuid;
begin
  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  if p_local_origem_id = p_local_destino_id then
    raise exception 'Origem e destino devem ser locais diferentes.';
  end if;

  select saldo into v_saldo_origem
    from saldo_estoque
    where epi_id = p_epi_id and local_id = p_local_origem_id;

  if coalesce(v_saldo_origem, 0) < p_quantidade then
    raise exception 'Saldo insuficiente no local de origem.';
  end if;

  insert into movimentacoes_estoque (empresa_id, tipo, epi_id, local_origem_id, local_destino_id, quantidade, documento, observacao)
    values (v_empresa_id, 'transferencia', p_epi_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_documento, p_observacao)
    returning id into v_movimentacao_id;

  update saldo_estoque
    set saldo = saldo - p_quantidade, atualizado_em = now()
    where epi_id = p_epi_id and local_id = p_local_origem_id;

  insert into saldo_estoque (empresa_id, epi_id, local_id, saldo)
    values (v_empresa_id, p_epi_id, p_local_destino_id, p_quantidade)
  on conflict (epi_id, local_id) do update
    set saldo = saldo_estoque.saldo + excluded.saldo, atualizado_em = now();

  return v_movimentacao_id;
end;
$$;
