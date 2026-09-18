-- Sprint 6 — EPIs e CAs (real). "Categoria" fica como texto livre pelo mesmo
-- motivo de Função/Setor em funcionarios: Categoria de EPI ainda é um
-- cadastro mock, sem tabela própria.
--
-- Diferença em relação a obras/funcionarios: o catálogo de perfis (Figma
-- 10.03) diz explicitamente que "Técnico de Segurança" cuida de
-- "EPIs, CAs e relatórios" — então esse perfil também gerencia esta tabela,
-- não só o Administrador.
--
-- "status" (Válido/A vencer) não é uma coluna: é calculado no front a partir
-- de validade_ca, porque RN079 deixa o prazo de antecedência do alerta como
-- "configurável" e ainda sem valor definido (ver docs/02-requisitos/regras-
-- de-negocio.md, pendência da seção 10). Usamos 60 dias como default
-- provisório até isso virar campo de configuração de verdade (10.06).

create table epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  categoria text,
  ca text not null,
  fabricante text,
  validade_ca date not null,
  periodicidade_troca text,
  estoque_minimo integer,
  descricao text,
  created_at timestamptz not null default now()
);

create unique index epis_empresa_ca_key on epis (empresa_id, ca);
create index epis_empresa_id_idx on epis (empresa_id);

alter table epis enable row level security;

create policy "epis: select da mesma empresa"
  on epis for select
  using (empresa_id = empresa_atual());

create policy "epis: tecnico_seguranca e administrador gerenciam"
  on epis for all
  using (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'tecnico_seguranca'))
  with check (empresa_id = empresa_atual());
