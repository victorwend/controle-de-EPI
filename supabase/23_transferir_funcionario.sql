-- Transferir funcionário de obra mantendo o histórico — EPI-339.
--
-- Pedido do Victor (01/11/2026): o ADMINISTRADOR pode transferir o
-- funcionário de uma obra para outra, levando todos os dados, e o
-- histórico precisa continuar mostrando o que ele recebeu em CADA obra.
--
-- Antes: a obra do funcionário era só funcionarios.obra_id. Mudar a obra
-- "apagava" de onde eram as entregas antigas (tudo parecia da obra nova)
-- e a equipe da obra antiga deixava de ver o que entregou.
--
-- O que esta correção faz:
--  A) entregas.obra_id e trocas_devolucoes_itens.obra_id: a obra do
--     funcionário NO MOMENTO da entrega/troca. Um gatilho preenche
--     sozinho; os registros antigos recebem a obra atual do funcionário.
--  B) Tabela funcionario_transferencias: o histórico de transferências
--     (de qual obra, para qual, quando, por quê e quem fez).
--  C) Função transferir_funcionario: só o Administrador; muda a obra e
--     registra a transferência numa operação só.
--  D) A equipe de uma obra continua vendo as entregas feitas NA OBRA
--     DELA, mesmo depois que o funcionário foi transferido.
--
-- O que "acompanha" o funcionário sem precisar mudar nada: os EPIs em
-- posse (posse_epi_funcionario), a função, a matriz, a ficha e o
-- histórico completo.
--
-- Teste: tests/banco/teste_transferencia_funcionario.sql
--        (antes: 7x FALHOU; depois: 8x OK).

-- =====================================================================
-- A) Obra no momento da entrega / troca
-- =====================================================================

alter table entregas add column obra_id uuid references obras(id) on delete set null;
alter table trocas_devolucoes_itens add column obra_id uuid references obras(id) on delete set null;

create index entregas_obra_id_idx on entregas (obra_id);

-- Registros que já existem: até hoje ninguém foi transferido, então a
-- obra atual do funcionário é a obra em que eles receberam.
update entregas e set obra_id = f.obra_id
  from funcionarios f where f.id = e.funcionario_id and e.obra_id is null;
update trocas_devolucoes_itens t set obra_id = f.obra_id
  from funcionarios f where f.id = t.funcionario_id and t.obra_id is null;

-- Novos registros: o gatilho grava a obra do funcionário naquele momento.
create function interno.gravar_obra_do_funcionario()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.obra_id is null then
    select obra_id into new.obra_id from funcionarios where id = new.funcionario_id;
  end if;
  return new;
end;
$$;

create trigger gravar_obra_do_funcionario
  before insert on entregas
  for each row execute function interno.gravar_obra_do_funcionario();

create trigger gravar_obra_do_funcionario
  before insert on trocas_devolucoes_itens
  for each row execute function interno.gravar_obra_do_funcionario();

-- =====================================================================
-- B) Histórico de transferências
-- =====================================================================

create table funcionario_transferencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete restrict,
  obra_origem_id uuid references obras(id) on delete restrict,
  obra_destino_id uuid not null references obras(id) on delete restrict,
  data_transferencia date not null default current_date,
  motivo text,
  responsavel_usuario_id uuid not null references usuarios(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index funcionario_transferencias_funcionario_idx on funcionario_transferencias (funcionario_id);

alter table funcionario_transferencias enable row level security;

-- Só leitura pelo sistema (gravação só pela função do item C). Vê quem
-- enxerga a obra de origem ou a de destino.
create policy "funcionario_transferencias: select das obras permitidas"
  on funcionario_transferencias for select
  using (
    empresa_id = empresa_atual()
    and ((obra_origem_id is not null and pode_ver_obra(obra_origem_id)) or pode_ver_obra(obra_destino_id))
  );

-- =====================================================================
-- C) Transferir (só o Administrador)
-- =====================================================================

create function transferir_funcionario(
  p_funcionario_id uuid,
  p_obra_destino_id uuid,
  p_data date default current_date,
  p_motivo text default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_func funcionarios%rowtype;
begin
  if auth.uid() is null or perfil_atual() is distinct from 'administrador' then
    raise exception 'Só o administrador transfere funcionário de obra.' using errcode = '42501';
  end if;

  select * into v_func from funcionarios where id = p_funcionario_id and empresa_id = empresa_atual();
  if not found then
    raise exception 'Funcionário não encontrado.' using errcode = '42501';
  end if;
  if v_func.status <> 'ativo' then
    raise exception 'Funcionário inativo não pode ser transferido. Reative-o antes.';
  end if;

  if not exists (select 1 from obras where id = p_obra_destino_id and empresa_id = empresa_atual()) then
    raise exception 'Obra de destino não encontrada nesta empresa.' using errcode = '42501';
  end if;
  if exists (select 1 from obras where id = p_obra_destino_id and status <> 'ativa') then
    raise exception 'A obra de destino está inativa.';
  end if;
  if v_func.obra_id is not distinct from p_obra_destino_id then
    raise exception 'O funcionário já está nesta obra.';
  end if;

  if p_data is null or p_data > current_date then
    raise exception 'A data da transferência não pode ser no futuro.';
  end if;
  if v_func.data_admissao is not null and p_data < v_func.data_admissao then
    raise exception 'A data da transferência não pode ser antes da admissão.';
  end if;

  insert into funcionario_transferencias
    (empresa_id, funcionario_id, obra_origem_id, obra_destino_id, data_transferencia, motivo)
  values
    (v_func.empresa_id, v_func.id, v_func.obra_id, p_obra_destino_id, p_data, nullif(btrim(coalesce(p_motivo, '')), ''));

  update funcionarios set obra_id = p_obra_destino_id where id = v_func.id;
end;
$$;

revoke execute on function transferir_funcionario(uuid, uuid, date, text) from public, anon;
grant execute on function transferir_funcionario(uuid, uuid, date, text) to authenticated;

-- =====================================================================
-- D) Cada obra continua vendo as entregas feitas nela
-- =====================================================================

drop policy "entregas: select das obras permitidas" on entregas;
create policy "entregas: select das obras permitidas"
  on entregas for select
  using (
    empresa_id = empresa_atual()
    and (pode_ver_funcionario(funcionario_id) or (obra_id is not null and pode_ver_obra(obra_id)))
  );

drop policy "trocas_devolucoes_itens: select das obras permitidas" on trocas_devolucoes_itens;
create policy "trocas_devolucoes_itens: select das obras permitidas"
  on trocas_devolucoes_itens for select
  using (
    empresa_id = empresa_atual()
    and (pode_ver_funcionario(funcionario_id) or (obra_id is not null and pode_ver_obra(obra_id)))
  );
