-- Sprint 2/3 — modelo minimo de tenant (empresa), usuarios e obras.
-- Cobre so o necessario para o fluxo de onboarding de empresa + convite de
-- colaborador (ver docs/05-arquitetura/plano-de-producao-telas.md). As demais
-- entidades do Sprint 2 (funcionario, EPI, estoque, etc.) entram em arquivos
-- numerados seguintes, um por modulo, na ordem em que cada sprint for tocando
-- o banco.

create extension if not exists pgcrypto;

create type perfil_usuario as enum (
  'administrador',
  'almoxarife',
  'tecnico_seguranca',
  'gestor',
  'operador'
);

-- Tenant. Cada empresa que contrata o produto vira uma linha aqui; todo dado
-- do sistema (obras, funcionarios, estoque...) sera escopado por empresa_id.
create table empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  cnpj text not null unique,
  created_at timestamptz not null default now()
);

-- Versao minima de Obra so para sustentar "obras permitidas" do usuario.
-- O cadastro completo (09.02) chega no Sprint 4 e pode adicionar colunas
-- aqui sem quebrar o que já existe.
create table obras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now()
);

-- Perfil de acesso de cada usuario autenticado (auth.users), 1:1 com a conta
-- do Supabase Auth. O id É o auth.users.id de propósito, para não duplicar
-- identidade.
create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome_completo text not null,
  email text not null,
  perfil perfil_usuario not null default 'operador',
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

create index usuarios_empresa_id_idx on usuarios(empresa_id);

-- Obras que um usuario pode acessar (RN011 — escopo por obra dentro da
-- empresa). Administrador normalmente enxerga todas; os demais perfis so as
-- que estiverem aqui.
create table usuario_obras (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  primary key (usuario_id, obra_id)
);

-- Funcoes auxiliares (security definer) para as policies de RLS lerem a
-- empresa/perfil do usuario logado sem cair em recursão de RLS sobre a
-- própria tabela "usuarios".
create function empresa_atual()
returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid();
$$;

create function perfil_atual()
returns perfil_usuario
language sql stable security definer set search_path = public as $$
  select perfil from usuarios where id = auth.uid();
$$;

alter table empresas enable row level security;
alter table obras enable row level security;
alter table usuarios enable row level security;
alter table usuario_obras enable row level security;

create policy "empresas: select da propria empresa"
  on empresas for select
  using (id = empresa_atual());

create policy "usuarios: select da mesma empresa"
  on usuarios for select
  using (empresa_id = empresa_atual());

create policy "usuarios: administrador gerencia"
  on usuarios for all
  using (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual());

create policy "obras: select da mesma empresa"
  on obras for select
  using (empresa_id = empresa_atual());

create policy "obras: administrador gerencia"
  on obras for all
  using (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual());

create policy "usuario_obras: select da mesma empresa"
  on usuario_obras for select
  using (
    exists (
      select 1 from usuarios u
      where u.id = usuario_obras.usuario_id and u.empresa_id = empresa_atual()
    )
  );

create policy "usuario_obras: administrador gerencia"
  on usuario_obras for all
  using (
    perfil_atual() = 'administrador'
    and exists (
      select 1 from usuarios u
      where u.id = usuario_obras.usuario_id and u.empresa_id = empresa_atual()
    )
  );

-- RPC chamada pela tela "Cadastro da empresa" logo após supabase.auth.signUp():
-- cria a empresa e já grava o próprio usuário autenticado como Administrador
-- dela. Bloqueia reuso por quem já pertence a uma empresa.
create function criar_empresa_com_administrador(
  p_razao_social text,
  p_cnpj text,
  p_nome_responsavel text
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if exists (select 1 from usuarios where id = auth.uid()) then
    raise exception 'Este usuário já pertence a uma empresa.';
  end if;

  insert into empresas (razao_social, cnpj)
    values (p_razao_social, p_cnpj)
    returning id into v_empresa_id;

  insert into usuarios (id, empresa_id, nome_completo, email, perfil)
    values (auth.uid(), v_empresa_id, p_nome_responsavel, auth.jwt() ->> 'email', 'administrador');

  return v_empresa_id;
end;
$$;
