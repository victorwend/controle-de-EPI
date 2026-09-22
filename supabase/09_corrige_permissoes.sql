-- Correção de permissões (RLS) — problemas 1 e 2 do diagnóstico de 22/09/2026.
--
-- Problema 1: as policies "for all" checavam o perfil só no USING. No INSERT
-- o Postgres usa apenas o WITH CHECK, então qualquer perfil da empresa
-- (operador, gestor...) conseguia cadastrar registros.
--
-- Problema 2: almoxarife/administrador podiam fazer UPDATE/DELETE direto em
-- saldo, movimentações, entregas, posse e trocas pelo navegador, sem passar
-- pelas funções. Isso contraria o ADR-008 (movimentação como fonte do
-- estoque) e o ADR-009 (histórico imutável).
--
-- Solução:
--   A) Cadastros: o perfil passa a ser exigido também no WITH CHECK.
--   B) Tabelas operacionais: somente leitura para o navegador. Só as 4
--      funções de negócio escrevem nelas.
--   C) As 4 funções ganham um "porteiro" (SECURITY DEFINER) que confere o
--      perfil e depois chama a função original, guardada no schema "interno",
--      que não é exposto pela API do Supabase.
--
-- Teste: tests/rls/teste_permissoes.sql (antes: 3x FALHOU; depois: 3x OK).

-- =====================================================================
-- A) Cadastros: perfil exigido também para criar registros
-- =====================================================================

drop policy "obras: administrador gerencia" on obras;
create policy "obras: administrador gerencia"
  on obras for all
  using      (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual() and perfil_atual() = 'administrador');

drop policy "funcionarios: administrador gerencia" on funcionarios;
create policy "funcionarios: administrador gerencia"
  on funcionarios for all
  using      (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual() and perfil_atual() = 'administrador');

drop policy "epis: tecnico_seguranca e administrador gerenciam" on epis;
create policy "epis: tecnico_seguranca e administrador gerenciam"
  on epis for all
  using      (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'tecnico_seguranca'))
  with check (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'tecnico_seguranca'));

drop policy "locais_estoque: almoxarife e administrador gerenciam" on locais_estoque;
create policy "locais_estoque: almoxarife e administrador gerenciam"
  on locais_estoque for all
  using      (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'))
  with check (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife'));

drop policy "usuarios: administrador gerencia" on usuarios;
create policy "usuarios: administrador gerencia"
  on usuarios for all
  using      (empresa_id = empresa_atual() and perfil_atual() = 'administrador')
  with check (empresa_id = empresa_atual() and perfil_atual() = 'administrador');

drop policy "usuario_obras: administrador gerencia" on usuario_obras;
create policy "usuario_obras: administrador gerencia"
  on usuario_obras for all
  using (
    perfil_atual() = 'administrador'
    and exists (select 1 from usuarios u where u.id = usuario_obras.usuario_id and u.empresa_id = empresa_atual())
  )
  with check (
    perfil_atual() = 'administrador'
    and exists (select 1 from usuarios u where u.id = usuario_obras.usuario_id and u.empresa_id = empresa_atual())
    and exists (select 1 from obras o where o.id = usuario_obras.obra_id and o.empresa_id = empresa_atual())
  );

-- =====================================================================
-- B) Tabelas operacionais: somente leitura para o navegador
-- =====================================================================
-- As policies de SELECT continuam; removemos só as de escrita.
-- Além disso, retiramos a permissão de escrita (GRANT), para que uma
-- tentativa direta dê erro claro em vez de "0 linhas alteradas".

drop policy "saldo_estoque: almoxarife e administrador gerenciam" on saldo_estoque;
drop policy "movimentacoes_estoque: almoxarife e administrador gerenciam" on movimentacoes_estoque;
drop policy "entregas: almoxarife e administrador gerenciam" on entregas;
drop policy "entrega_itens: almoxarife e administrador gerenciam" on entrega_itens;
drop policy "posse: almoxarife e administrador gerenciam" on posse_epi_funcionario;
drop policy "trocas_devolucoes_itens: almoxarife e administrador gerenciam" on trocas_devolucoes_itens;

revoke insert, update, delete, truncate on
  saldo_estoque, movimentacoes_estoque, entregas, entrega_itens,
  posse_epi_funcionario, trocas_devolucoes_itens
from anon, authenticated;

-- =====================================================================
-- C) Funções de negócio: "porteiro" que confere o perfil
-- =====================================================================
-- As funções originais passam para o schema "interno" (não exposto pela API)
-- e só podem ser chamadas pelos porteiros abaixo.

create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;

alter function registrar_entrada_estoque(uuid, uuid, integer, text, text, text) set schema interno;
alter function transferir_estoque(uuid, uuid, uuid, integer, text, text) set schema interno;
alter function registrar_entrega(uuid, uuid, jsonb, text) set schema interno;
alter function registrar_troca_devolucao(uuid, uuid, text, jsonb) set schema interno;

alter function interno.registrar_entrada_estoque(uuid, uuid, integer, text, text, text) set search_path = public;
alter function interno.transferir_estoque(uuid, uuid, uuid, integer, text, text) set search_path = public;
alter function interno.registrar_entrega(uuid, uuid, jsonb, text) set search_path = public;
alter function interno.registrar_troca_devolucao(uuid, uuid, text, jsonb) set search_path = public;

revoke execute on all functions in schema interno from public, anon, authenticated;

-- Confere se o usuário logado tem um dos perfis permitidos.
create function exigir_perfil(variadic p_perfis perfil_usuario[])
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;
  if perfil_atual() is null or not (perfil_atual() = any (p_perfis)) then
    raise exception 'Seu perfil não tem permissão para esta operação.' using errcode = '42501';
  end if;
end;
$$;

-- Os porteiros têm o MESMO nome e os MESMOS parâmetros das funções
-- originais, então o frontend (supabase.rpc(...)) não precisa mudar.

create function registrar_entrada_estoque(
  p_epi_id uuid, p_local_id uuid, p_quantidade integer,
  p_documento text default null, p_fornecedor text default null, p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  return interno.registrar_entrada_estoque(p_epi_id, p_local_id, p_quantidade, p_documento, p_fornecedor, p_observacao);
end;
$$;

create function transferir_estoque(
  p_epi_id uuid, p_local_origem_id uuid, p_local_destino_id uuid, p_quantidade integer,
  p_documento text default null, p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  return interno.transferir_estoque(p_epi_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_documento, p_observacao);
end;
$$;

create function registrar_entrega(
  p_funcionario_id uuid, p_local_id uuid, p_itens jsonb, p_observacao text default null
)
returns text
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  return interno.registrar_entrega(p_funcionario_id, p_local_id, p_itens, p_observacao);
end;
$$;

create function registrar_troca_devolucao(
  p_funcionario_id uuid, p_local_id uuid, p_motivo text, p_itens jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  perform interno.registrar_troca_devolucao(p_funcionario_id, p_local_id, p_motivo, p_itens);
end;
$$;

revoke execute on function
  exigir_perfil(perfil_usuario[]),
  registrar_entrada_estoque(uuid, uuid, integer, text, text, text),
  transferir_estoque(uuid, uuid, uuid, integer, text, text),
  registrar_entrega(uuid, uuid, jsonb, text),
  registrar_troca_devolucao(uuid, uuid, text, jsonb)
from public, anon;

grant execute on function
  exigir_perfil(perfil_usuario[]),
  registrar_entrada_estoque(uuid, uuid, integer, text, text, text),
  transferir_estoque(uuid, uuid, uuid, integer, text, text),
  registrar_entrega(uuid, uuid, jsonb, text),
  registrar_troca_devolucao(uuid, uuid, text, jsonb)
to authenticated;
