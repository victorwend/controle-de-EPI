-- Matriz EPI x Função com dados reais — EPI-280.
--
-- Pedido do Victor (01/11/2026): na tela Matriz EPI x Função, poder CRIAR
-- a função e configurar quais EPIs (e quantos) cada função recebe, podendo
-- alterar depois.
--
-- Antes: a tela usava dados de exemplo (data/episConfig.js) e a função do
-- funcionário era só um texto livre (funcionarios.funcao).
--
-- O que esta correção faz:
--  A) Tabela FUNCOES (cadastro de funções por empresa). As funções que já
--     estão escritas nos funcionários viram funções cadastradas.
--  B) funcionarios.funcao_id liga o funcionário à função. O texto
--     funcionarios.funcao continua existindo (importação por planilha e
--     telas antigas), e um gatilho mantém os dois juntos:
--       - digitou "servente" e já existe "Servente"? usa a mesma função;
--       - digitou uma função nova? ela é criada sozinha;
--       - renomeou a função? os funcionários passam a mostrar o nome novo.
--  C) Tabela MATRIZ_EPI_FUNCAO: para cada função, quais EPIs, quantos,
--     se é obrigatório ou recomendado e de quantos em quantos meses trocar.
--  D) Função salvar_matriz_funcao: grava a matriz de uma função de uma vez
--     (tudo ou nada).
--
-- Quem pode alterar: quem tem a permissão "gerenciar_epis" (padrão:
-- Técnico de Segurança e Administrador; caixinhas da correção 19).
-- Funções também podem ser criadas por quem cadastra funcionários.
--
-- Regras adotadas (validar com a Segurança do Trabalho e registrar no Doc 06):
--  - quantidade por entrega: inteiro maior que zero;
--  - obrigatório ou recomendado;
--  - periodicidade de troca em meses (opcional);
--  - um EPI aparece no máximo uma vez por função.
--
-- Teste: tests/banco/teste_matriz_epi_funcao.sql (antes: 10x FALHOU; depois: 10x OK).

-- =====================================================================
-- A) Funções
-- =====================================================================

create table funcoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now()
);

-- Não pode haver "Servente" e "servente" na mesma empresa.
create unique index funcoes_empresa_nome_key on funcoes (empresa_id, lower(nome));

-- Nome sempre arrumado: sem espaços nas pontas nem espaços repetidos.
create function interno.normalizar_nome_funcao(p_nome text)
returns text
language sql immutable as $$
  select nullif(regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g'), '');
$$;

create function interno.arrumar_nome_funcao()
returns trigger
language plpgsql as $$
begin
  new.nome := interno.normalizar_nome_funcao(new.nome);
  return new;
end;
$$;

create trigger arrumar_nome_funcao
  before insert or update of nome on funcoes
  for each row execute function interno.arrumar_nome_funcao();

alter table funcoes enable row level security;

create policy "funcoes: select da mesma empresa"
  on funcoes for select
  using (empresa_id = empresa_atual());

create policy "funcoes: quem tem permissão gerencia"
  on funcoes for all
  using      (empresa_id = empresa_atual() and (tem_permissao('gerenciar_epis') or tem_permissao('gerenciar_funcionarios')))
  with check (empresa_id = empresa_atual() and (tem_permissao('gerenciar_epis') or tem_permissao('gerenciar_funcionarios')));

-- As funções já escritas nos funcionários viram funções cadastradas.
insert into funcoes (empresa_id, nome)
select distinct on (empresa_id, lower(interno.normalizar_nome_funcao(funcao)))
       empresa_id, interno.normalizar_nome_funcao(funcao)
  from funcionarios
 where interno.normalizar_nome_funcao(funcao) is not null
 order by empresa_id, lower(interno.normalizar_nome_funcao(funcao)), created_at;

-- =====================================================================
-- B) Funcionário ligado à função
-- =====================================================================

alter table funcionarios
  add column funcao_id uuid references funcoes(id) on delete restrict;

create index funcionarios_funcao_id_idx on funcionarios (funcao_id);

update funcionarios f
   set funcao_id = fn.id,
       funcao = fn.nome
  from funcoes fn
 where fn.empresa_id = f.empresa_id
   and lower(fn.nome) = lower(interno.normalizar_nome_funcao(f.funcao));

-- Mantém funcao (texto) e funcao_id juntos.
-- SECURITY DEFINER: quem cadastra funcionário pode não ter permissão de
-- mexer no cadastro de funções, mas a função nova precisa ser criada.
create function interno.ligar_funcao_funcionario()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_nome      text;   -- o que foi digitado, arrumado
  v_existente text;   -- o nome como está no cadastro de funções
  v_id        uuid;
begin
  -- Mudou só o funcao_id (escolheu a função na lista): copia o nome.
  if tg_op = 'UPDATE' and new.funcao_id is distinct from old.funcao_id
     and new.funcao is not distinct from old.funcao then
    select nome into new.funcao from funcoes where id = new.funcao_id and empresa_id = new.empresa_id;
    if new.funcao_id is not null and new.funcao is null then
      raise exception 'Função não encontrada nesta empresa.' using errcode = '42501';
    end if;
    return new;
  end if;

  v_nome := interno.normalizar_nome_funcao(new.funcao);
  if v_nome is null then
    new.funcao := null;
    new.funcao_id := null;
    return new;
  end if;

  select id, nome into v_id, v_existente
    from funcoes
   where empresa_id = new.empresa_id and lower(nome) = lower(v_nome);

  if v_id is null then
    insert into funcoes (empresa_id, nome) values (new.empresa_id, v_nome)
    returning id, nome into v_id, v_existente;
  end if;

  new.funcao_id := v_id;
  new.funcao := v_existente;
  return new;
end;
$$;

create trigger ligar_funcao_funcionario
  before insert or update of funcao, funcao_id on funcionarios
  for each row execute function interno.ligar_funcao_funcionario();

-- Renomeou a função? Os funcionários dela passam a mostrar o nome novo.
create function interno.propagar_nome_funcao()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update funcionarios set funcao = new.nome
   where funcao_id = new.id and funcao is distinct from new.nome;
  return new;
end;
$$;

create trigger propagar_nome_funcao
  after update of nome on funcoes
  for each row execute function interno.propagar_nome_funcao();

-- =====================================================================
-- C) Matriz EPI x Função
-- =====================================================================

create table matriz_epi_funcao (
  empresa_id uuid not null references empresas(id) on delete cascade,
  funcao_id uuid not null references funcoes(id) on delete cascade,
  epi_id uuid not null references epis(id) on delete cascade,
  quantidade integer not null check (quantidade > 0),
  obrigatorio boolean not null default true,
  periodicidade_meses integer check (periodicidade_meses is null or periodicidade_meses > 0),
  primary key (funcao_id, epi_id)
);

create index matriz_epi_funcao_empresa_idx on matriz_epi_funcao (empresa_id);

-- Função e EPI precisam ser da mesma empresa da linha.
create function interno.conferir_matriz_empresa()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from funcoes where id = new.funcao_id and empresa_id = new.empresa_id)
     or not exists (select 1 from epis where id = new.epi_id and empresa_id = new.empresa_id) then
    raise exception 'Função ou EPI não encontrado nesta empresa.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger conferir_matriz_empresa
  before insert or update on matriz_epi_funcao
  for each row execute function interno.conferir_matriz_empresa();

alter table matriz_epi_funcao enable row level security;

create policy "matriz_epi_funcao: select da mesma empresa"
  on matriz_epi_funcao for select
  using (empresa_id = empresa_atual());

create policy "matriz_epi_funcao: quem tem permissão gerencia"
  on matriz_epi_funcao for all
  using      (empresa_id = empresa_atual() and tem_permissao('gerenciar_epis'))
  with check (empresa_id = empresa_atual() and tem_permissao('gerenciar_epis'));

-- =====================================================================
-- D) Salvar a matriz de UMA função (tudo ou nada)
-- =====================================================================
-- p_itens: [{ "epi_id": "...", "quantidade": 2, "obrigatorio": true,
--             "periodicidade_meses": 6 }, ...]  (lista COMPLETA da função)
-- SECURITY INVOKER: roda com as permissões de quem chamou (RLS vale).

create function salvar_matriz_funcao(p_funcao_id uuid, p_itens jsonb)
returns void
language plpgsql set search_path = public as $$
declare
  v_itens jsonb := coalesce(p_itens, '[]'::jsonb);
begin
  perform exigir_permissao('gerenciar_epis');

  if not exists (select 1 from funcoes where id = p_funcao_id and empresa_id = empresa_atual()) then
    raise exception 'Função não encontrada.' using errcode = '42501';
  end if;

  if jsonb_typeof(v_itens) <> 'array' then
    raise exception 'Lista de EPIs inválida.';
  end if;

  if (select count(*) from jsonb_array_elements(v_itens))
     <> (select count(distinct item ->> 'epi_id') from jsonb_array_elements(v_itens) as item) then
    raise exception 'O mesmo EPI aparece mais de uma vez na matriz.';
  end if;

  delete from matriz_epi_funcao where funcao_id = p_funcao_id;

  insert into matriz_epi_funcao (empresa_id, funcao_id, epi_id, quantidade, obrigatorio, periodicidade_meses)
  select empresa_atual(),
         p_funcao_id,
         (item ->> 'epi_id')::uuid,
         (item ->> 'quantidade')::integer,
         coalesce((item ->> 'obrigatorio')::boolean, true),
         nullif(item ->> 'periodicidade_meses', '')::integer
    from jsonb_array_elements(v_itens) as item;
end;
$$;

revoke execute on function salvar_matriz_funcao(uuid, jsonb) from public, anon;
grant execute on function salvar_matriz_funcao(uuid, jsonb) to authenticated;
