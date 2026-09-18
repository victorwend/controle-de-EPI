-- Sprint 5 — Funcionários (real). "Função" e "Setor" ficam como texto livre
-- por enquanto: Cargo e Setor ainda são cadastros mock (cadastrosConfig.js),
-- sem tabela própria — mesmo gap já documentado para outros cadastros que
-- dependem de Funcionários/Cargo/Setor existirem de verdade.
-- "episAtivos"/"pendências"/"última entrega" do protótipo dependem de
-- Entregas (não existe ainda) — não entram no schema, o front mostra 0/vazio
-- honestamente até a Sprint 8 (Entregas) ser migrada.

create table funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  matricula text not null,
  nome text not null,
  cpf text,
  funcao text,
  setor text,
  obra_id uuid references obras(id) on delete set null,
  data_admissao date,
  observacoes text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  biometria_cadastrada boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index funcionarios_empresa_matricula_key on funcionarios (empresa_id, matricula);
create index funcionarios_empresa_id_idx on funcionarios (empresa_id);
create index funcionarios_obra_id_idx on funcionarios (obra_id);

alter table funcionarios enable row level security;

create policy "funcionarios: select da mesma empresa"
  on funcionarios for select
  using (empresa_id = empresa_atual());

create policy "funcionarios: administrador gerencia"
  on funcionarios for all
  using (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual());
