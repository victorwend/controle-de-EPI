-- Sprint 4 (adiantado) — obra real, com os campos do cadastro 09.02, e
-- correção do domínio de status: o formulário usa Ativa/Inativa, não
-- ativa/encerrada como a versão mínima de 01_ tinha assumido.

alter table obras drop constraint if exists obras_status_check;

alter table obras
  add column if not exists codigo text,
  add column if not exists centro_custo text,
  add column if not exists cidade_uf text,
  add column if not exists responsavel_nome text;
  -- "responsavel_nome" fica como texto livre por enquanto (sem FK para
  -- funcionarios, que ainda não existe como tabela — mesmo gap já registrado
  -- no README para outros cadastros que dependem de Funcionários).

alter table obras alter column status set default 'ativa';

alter table obras
  add constraint obras_status_check check (status in ('ativa', 'inativa'));

create unique index if not exists obras_empresa_codigo_key
  on obras (empresa_id, codigo)
  where codigo is not null;
