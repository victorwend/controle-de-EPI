-- Escopo por obra — EPI-274 (RN-011 e RN-045).
--
-- Problema: a tabela usuario_obras diz quais obras cada usuário pode
-- acessar, mas nenhuma regra do banco usava essa informação. Um almoxarife
-- de uma obra via e mexia em funcionários e estoque de todas as obras.
--
-- Regra:
--  - ADMINISTRADOR vê e opera todas as obras da empresa.
--  - Os outros perfis só veem e operam as obras ligadas a eles em
--    usuario_obras.
--  - O que NÃO tem obra (funcionário da sede, local de estoque central)
--    é visível para todos da empresa.
--  - EPIs (catálogo) e usuários continuam visíveis para toda a empresa.
--
-- Teste: tests/banco/teste_escopo_obra.sql (antes: 6x FALHOU; depois: 10x OK).

-- =====================================================================
-- A) Funções de apoio (usadas nas policies e nas funções de negócio)
-- =====================================================================
-- SECURITY DEFINER para poderem consultar usuario_obras/locais/funcionarios
-- sem esbarrar no próprio RLS (evita regra chamando regra em círculo).

create function pode_ver_obra(p_obra_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select perfil_atual() = 'administrador'
      or p_obra_id is null
      or exists (
        select 1 from usuario_obras uo
         where uo.usuario_id = auth.uid() and uo.obra_id = p_obra_id
      );
$$;

create function pode_ver_local(p_local_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from locais_estoque l
     where l.id = p_local_id and l.empresa_id = empresa_atual() and pode_ver_obra(l.obra_id)
  );
$$;

create function pode_ver_funcionario(p_funcionario_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from funcionarios f
     where f.id = p_funcionario_id and f.empresa_id = empresa_atual() and pode_ver_obra(f.obra_id)
  );
$$;

revoke execute on function pode_ver_obra(uuid), pode_ver_local(uuid), pode_ver_funcionario(uuid) from public, anon;
grant execute on function pode_ver_obra(uuid), pode_ver_local(uuid), pode_ver_funcionario(uuid) to authenticated;

-- =====================================================================
-- B) Leitura (SELECT) limitada às obras permitidas
-- =====================================================================

drop policy "obras: select da mesma empresa" on obras;
create policy "obras: select das obras permitidas"
  on obras for select
  using (empresa_id = empresa_atual() and pode_ver_obra(id));

drop policy "funcionarios: select da mesma empresa" on funcionarios;
create policy "funcionarios: select das obras permitidas"
  on funcionarios for select
  using (empresa_id = empresa_atual() and pode_ver_obra(obra_id));

drop policy "locais_estoque: select da mesma empresa" on locais_estoque;
create policy "locais_estoque: select das obras permitidas"
  on locais_estoque for select
  using (empresa_id = empresa_atual() and pode_ver_obra(obra_id));

drop policy "saldo_estoque: select da mesma empresa" on saldo_estoque;
create policy "saldo_estoque: select das obras permitidas"
  on saldo_estoque for select
  using (empresa_id = empresa_atual() and pode_ver_local(local_id));

drop policy "movimentacoes_estoque: select da mesma empresa" on movimentacoes_estoque;
create policy "movimentacoes_estoque: select das obras permitidas"
  on movimentacoes_estoque for select
  using (
    empresa_id = empresa_atual()
    and (
      (local_origem_id is not null and pode_ver_local(local_origem_id))
      or (local_destino_id is not null and pode_ver_local(local_destino_id))
    )
  );

drop policy "entregas: select da mesma empresa" on entregas;
create policy "entregas: select das obras permitidas"
  on entregas for select
  using (empresa_id = empresa_atual() and pode_ver_funcionario(funcionario_id));

-- entrega_itens já filtra pela tabela entregas (que agora respeita a obra).

drop policy "posse: select da mesma empresa" on posse_epi_funcionario;
create policy "posse: select das obras permitidas"
  on posse_epi_funcionario for select
  using (empresa_id = empresa_atual() and pode_ver_funcionario(funcionario_id));

drop policy "trocas_devolucoes_itens: select da mesma empresa" on trocas_devolucoes_itens;
create policy "trocas_devolucoes_itens: select das obras permitidas"
  on trocas_devolucoes_itens for select
  using (empresa_id = empresa_atual() and pode_ver_funcionario(funcionario_id));

-- =====================================================================
-- C) Escrita em locais de estoque também limitada às obras permitidas
-- =====================================================================
-- (Policies "for all" também valem para leitura; sem isto o almoxarife
-- continuaria vendo e editando locais de outras obras por esta porta.)

drop policy "locais_estoque: almoxarife e administrador gerenciam" on locais_estoque;
create policy "locais_estoque: almoxarife e administrador gerenciam"
  on locais_estoque for all
  using      (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife') and pode_ver_obra(obra_id))
  with check (empresa_id = empresa_atual() and perfil_atual() in ('administrador', 'almoxarife') and pode_ver_obra(obra_id));

-- =====================================================================
-- D) Funções de negócio: só com funcionário e local das obras permitidas
-- =====================================================================
-- Substituem as versões das correções 11 e 13 (mesma assinatura).

create or replace function interno.exigir_local_da_empresa(p_local_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from locais_estoque
     where id = p_local_id
       and empresa_id = empresa_atual()
       and status = 'ativo'
       and pode_ver_obra(obra_id)
  ) then
    raise exception 'Local de estoque não encontrado, inativo ou fora das suas obras.' using errcode = '42501';
  end if;
end;
$$;

create or replace function interno.exigir_funcionario_da_empresa(p_funcionario_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from funcionarios
     where id = p_funcionario_id
       and empresa_id = empresa_atual()
       and pode_ver_obra(obra_id)
  ) then
    raise exception 'Funcionário não encontrado ou fora das suas obras.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function interno.exigir_local_da_empresa(uuid), interno.exigir_funcionario_da_empresa(uuid)
  from public, anon, authenticated;
