-- Permissões configuráveis por perfil — EPI-331.
--
-- Pedido do Victor (01/11/2026): na tabela "O que cada perfil pode fazer"
-- (tela Usuários e permissões), o Administrador escolhe com caixinhas o
-- que cada perfil pode fazer.
--
-- Antes: os perfis estavam ESCRITOS nas regras do banco, por exemplo
-- "perfil_atual() in ('administrador', 'almoxarife')". Mudar exigia
-- uma correção SQL nova.
-- Agora: cada empresa tem a sua tabela permissoes_perfil (perfil x ação).
-- As regras perguntam tem_permissao('ação'), e a resposta vem dessa
-- tabela.
--
-- O que continua FIXO (não tem caixinha), por segurança:
--  - Administrador pode tudo (assim ninguém tranca a empresa para fora);
--  - todo perfil CONSULTA os dados das obras liberadas para ele;
--  - só o Administrador gerencia usuários e permissões.
--
-- Ações configuráveis (o padrão é o que já valia antes desta correção):
--   gerenciar_epis          Cadastrar e editar EPIs e CAs   (padrão: Técnico de Segurança)
--   gerenciar_estoque       Locais, entrada e transferência (padrão: Almoxarife)
--   registrar_entregas      Entregar EPI, troca e devolução (padrão: Almoxarife)
--   gerenciar_funcionarios  Cadastrar, editar e inativar funcionários (padrão: ninguém)
--   gerenciar_obras         Cadastrar e editar obras        (padrão: ninguém)
--   ver_todas_obras         Ver todas as obras sem liberar uma a uma (padrão: ninguém)
--
-- Teste: tests/banco/teste_permissoes_configuraveis.sql
--        (antes: 8x FALHOU; depois: 10x OK).

-- =====================================================================
-- A) Tabela de permissões (uma linha = "este perfil pode esta ação")
-- =====================================================================

create table permissoes_perfil (
  empresa_id uuid not null references empresas(id) on delete cascade,
  perfil perfil_usuario not null
    check (perfil in ('almoxarife', 'tecnico_seguranca', 'gestor')),
  acao text not null
    check (acao in ('gerenciar_epis', 'gerenciar_estoque', 'registrar_entregas',
                    'gerenciar_funcionarios', 'gerenciar_obras', 'ver_todas_obras')),
  primary key (empresa_id, perfil, acao)
);

alter table permissoes_perfil enable row level security;

-- Todos da empresa podem LER (a tela mostra as caixinhas e cada um
-- precisa saber o que pode fazer). Ninguém grava direto: só pela função
-- salvar_permissoes_perfil (item D).
create policy "permissoes_perfil: select da mesma empresa"
  on permissoes_perfil for select
  using (empresa_id = empresa_atual());

-- Padrão = exatamente o que valia antes (nada muda ao rodar esta correção).
create function interno.criar_permissoes_padrao(p_empresa_id uuid)
returns void
language sql as $$
  insert into permissoes_perfil (empresa_id, perfil, acao) values
    (p_empresa_id, 'tecnico_seguranca', 'gerenciar_epis'),
    (p_empresa_id, 'almoxarife', 'gerenciar_estoque'),
    (p_empresa_id, 'almoxarife', 'registrar_entregas')
  on conflict do nothing;
$$;

-- Empresas que já existem recebem o padrão agora.
do $$ begin perform interno.criar_permissoes_padrao(id) from empresas; end $$;

-- Empresa nova já nasce com o padrão.
create function interno.permissoes_padrao_empresa_nova()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform interno.criar_permissoes_padrao(new.id);
  return new;
end;
$$;

create trigger permissoes_padrao_empresa_nova
  after insert on empresas
  for each row execute function interno.permissoes_padrao_empresa_nova();

-- =====================================================================
-- B) Perguntas que as regras fazem
-- =====================================================================

create function tem_permissao(p_acao text)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    perfil_atual() = 'administrador'
    or exists (
      select 1 from permissoes_perfil
       where empresa_id = empresa_atual() and perfil = perfil_atual() and acao = p_acao
    ),
    false);
$$;

create function exigir_permissao(p_acao text)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;
  if not tem_permissao(p_acao) then
    raise exception 'Seu perfil não tem permissão para esta operação.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function tem_permissao(text), exigir_permissao(text) from public, anon;
grant execute on function tem_permissao(text), exigir_permissao(text) to authenticated;

-- "Ver todas as obras" passa a valer também para quem recebeu a permissão.
create or replace function pode_ver_obra(p_obra_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select perfil_atual() = 'administrador'
      or p_obra_id is null
      or tem_permissao('ver_todas_obras')
      or exists (
        select 1 from usuario_obras uo
         where uo.usuario_id = auth.uid() and uo.obra_id = p_obra_id
      );
$$;

-- =====================================================================
-- C) Regras de cadastro (RLS) usando tem_permissao
-- =====================================================================

drop policy "epis: tecnico_seguranca e administrador gerenciam" on epis;
create policy "epis: quem tem permissão gerencia"
  on epis for all
  using      (empresa_id = empresa_atual() and tem_permissao('gerenciar_epis'))
  with check (empresa_id = empresa_atual() and tem_permissao('gerenciar_epis'));

drop policy "locais_estoque: almoxarife e administrador gerenciam" on locais_estoque;
create policy "locais_estoque: quem tem permissão gerencia"
  on locais_estoque for all
  using      (empresa_id = empresa_atual() and tem_permissao('gerenciar_estoque') and pode_ver_obra(obra_id))
  with check (empresa_id = empresa_atual() and tem_permissao('gerenciar_estoque') and pode_ver_obra(obra_id));

drop policy "funcionarios: administrador gerencia" on funcionarios;
create policy "funcionarios: quem tem permissão gerencia"
  on funcionarios for all
  using      (empresa_id = empresa_atual() and tem_permissao('gerenciar_funcionarios') and pode_ver_obra(obra_id))
  with check (empresa_id = empresa_atual() and tem_permissao('gerenciar_funcionarios') and pode_ver_obra(obra_id));

drop policy "obras: administrador gerencia" on obras;
create policy "obras: quem tem permissão gerencia"
  on obras for all
  using      (empresa_id = empresa_atual() and tem_permissao('gerenciar_obras'))
  with check (empresa_id = empresa_atual() and tem_permissao('gerenciar_obras'));

-- =====================================================================
-- D) Funções de negócio: trocam exigir_perfil por exigir_permissao
-- =====================================================================
-- Mesmo nome e mesmos parâmetros: o frontend não muda. Só a 1ª linha de
-- cada porteiro foi trocada; o resto é igual à versão anterior (11 e 14).

create or replace function registrar_entrada_estoque(
  p_epi_id uuid, p_local_id uuid, p_quantidade integer,
  p_documento text default null, p_fornecedor text default null, p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_permissao('gerenciar_estoque');
  perform interno.exigir_epis_da_empresa(array[p_epi_id]);
  perform interno.exigir_local_da_empresa(p_local_id);
  return interno.registrar_entrada_estoque(p_epi_id, p_local_id, p_quantidade, p_documento, p_fornecedor, p_observacao);
end;
$$;

create or replace function transferir_estoque(
  p_epi_id uuid, p_local_origem_id uuid, p_local_destino_id uuid, p_quantidade integer,
  p_documento text default null, p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_permissao('gerenciar_estoque');
  perform interno.exigir_epis_da_empresa(array[p_epi_id]);
  perform interno.exigir_local_da_empresa(p_local_origem_id);
  perform interno.exigir_local_da_empresa(p_local_destino_id);
  return interno.transferir_estoque(p_epi_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_documento, p_observacao);
end;
$$;

create or replace function registrar_entrega(
  p_funcionario_id uuid, p_local_id uuid, p_itens jsonb, p_observacao text, p_aceite_metodo text
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

  -- RN-019 / RN-044: funcionário inativo não recebe nova entrega.
  if exists (select 1 from funcionarios where id = p_funcionario_id and status <> 'ativo') then
    raise exception 'Funcionário inativo não pode receber EPI.' using errcode = 'P0001';
  end if;

  return interno.registrar_entrega(p_funcionario_id, p_local_id, p_itens, p_observacao, p_aceite_metodo);
end;
$$;

create or replace function registrar_troca_devolucao(
  p_funcionario_id uuid, p_local_id uuid, p_motivo text, p_itens jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_permissao('registrar_entregas');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  perform interno.exigir_local_da_empresa(p_local_id);
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));
  perform interno.registrar_troca_devolucao(p_funcionario_id, p_local_id, p_motivo, p_itens);
end;
$$;

-- =====================================================================
-- E) Salvar as caixinhas de UM perfil (só o Administrador)
-- =====================================================================
-- Recebe a lista COMPLETA de ações marcadas para o perfil: o que não
-- vier na lista fica desmarcado. Tudo ou nada.

create function salvar_permissoes_perfil(p_perfil perfil_usuario, p_acoes text[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_acoes text[] := coalesce(p_acoes, array[]::text[]);
begin
  if perfil_atual() is distinct from 'administrador' then
    raise exception 'Só o administrador muda as permissões dos perfis.' using errcode = '42501';
  end if;

  if p_perfil not in ('almoxarife', 'tecnico_seguranca', 'gestor') then
    raise exception 'As permissões do perfil "%" não podem ser alteradas.', p_perfil;
  end if;

  -- Quem cadastra obra precisa enxergar todas: senão criaria uma obra
  -- que ele mesmo não consegue ver.
  if 'gerenciar_obras' = any (v_acoes) and not ('ver_todas_obras' = any (v_acoes)) then
    raise exception 'Para cadastrar obras, o perfil também precisa de "Ver todas as obras".';
  end if;

  delete from permissoes_perfil where empresa_id = empresa_atual() and perfil = p_perfil;

  insert into permissoes_perfil (empresa_id, perfil, acao)
  select distinct empresa_atual(), p_perfil, acao from unnest(v_acoes) as acao;
end;
$$;

revoke execute on function salvar_permissoes_perfil(perfil_usuario, text[]) from public, anon;
grant execute on function salvar_permissoes_perfil(perfil_usuario, text[]) to authenticated;
