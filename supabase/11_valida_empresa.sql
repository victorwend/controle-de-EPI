-- Validação da empresa dos IDs — EPI-272 (problema 4 do diagnóstico de 22/09/2026).
--
-- Problema: as 4 funções de negócio recebiam IDs de EPI, local e
-- funcionário e gravavam sem conferir de qual empresa eles eram. Como os
-- porteiros da correção 09 rodam como SECURITY DEFINER (sem RLS), um
-- usuário da empresa A conseguia, por exemplo, transferir o estoque da
-- empresa B para um local seu, ou entregar EPI a um funcionário de B.
-- Isso quebra o isolamento entre empresas (RNF-014, RN-009).
--
-- Solução: antes de chamar a função original, o porteiro confere se
-- cada ID pertence a empresa_atual(). Se algum não pertencer (ou não
-- existir), a operação é recusada com erro 42501 e nada é gravado.
-- A mensagem é a mesma nos dois casos, para não revelar se o ID existe
-- em outra empresa.
--
-- Teste: tests/banco/teste_isolamento.sql (antes: 6x FALHOU; depois: 7x OK).

-- =====================================================================
-- A) Funções de conferência (ficam no schema "interno", fora da API)
-- =====================================================================

create function interno.exigir_epis_da_empresa(p_epi_ids uuid[])
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (
    select 1
      from unnest(p_epi_ids) as pedido(id)
      left join epis e on e.id = pedido.id and e.empresa_id = empresa_atual()
     where e.id is null
  ) then
    raise exception 'EPI não encontrado nesta empresa.' using errcode = '42501';
  end if;
end;
$$;

create function interno.exigir_local_da_empresa(p_local_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from locais_estoque where id = p_local_id and empresa_id = empresa_atual()
  ) then
    raise exception 'Local de estoque não encontrado nesta empresa.' using errcode = '42501';
  end if;
end;
$$;

create function interno.exigir_funcionario_da_empresa(p_funcionario_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from funcionarios where id = p_funcionario_id and empresa_id = empresa_atual()
  ) then
    raise exception 'Funcionário não encontrado nesta empresa.' using errcode = '42501';
  end if;
end;
$$;

-- Lista os epi_id de uma lista de itens em JSON: [{"epi_id": ..., ...}, ...]
create function interno.epis_dos_itens(p_itens jsonb)
returns uuid[]
language sql immutable as $$
  select coalesce(array_agg((item ->> 'epi_id')::uuid), '{}')
    from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item;
$$;

revoke execute on all functions in schema interno from public, anon, authenticated;

-- =====================================================================
-- B) Porteiros: mesma assinatura da correção 09, agora conferindo a empresa
-- =====================================================================
-- Ordem dentro de cada porteiro: 1) perfil, 2) empresa dos IDs,
-- 3) função original. O frontend não precisa mudar.

create or replace function registrar_entrada_estoque(
  p_epi_id uuid, p_local_id uuid, p_quantidade integer,
  p_documento text default null, p_fornecedor text default null, p_observacao text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
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
  perform exigir_perfil('administrador', 'almoxarife');
  perform interno.exigir_epis_da_empresa(array[p_epi_id]);
  perform interno.exigir_local_da_empresa(p_local_origem_id);
  perform interno.exigir_local_da_empresa(p_local_destino_id);
  return interno.transferir_estoque(p_epi_id, p_local_origem_id, p_local_destino_id, p_quantidade, p_documento, p_observacao);
end;
$$;

create or replace function registrar_entrega(
  p_funcionario_id uuid, p_local_id uuid, p_itens jsonb, p_observacao text default null
)
returns text
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  perform interno.exigir_local_da_empresa(p_local_id);
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));
  return interno.registrar_entrega(p_funcionario_id, p_local_id, p_itens, p_observacao);
end;
$$;

create or replace function registrar_troca_devolucao(
  p_funcionario_id uuid, p_local_id uuid, p_motivo text, p_itens jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_perfil('administrador', 'almoxarife');
  perform interno.exigir_funcionario_da_empresa(p_funcionario_id);
  perform interno.exigir_local_da_empresa(p_local_id);
  perform interno.exigir_epis_da_empresa(interno.epis_dos_itens(p_itens));
  perform interno.registrar_troca_devolucao(p_funcionario_id, p_local_id, p_motivo, p_itens);
end;
$$;

-- "create or replace" mantém as permissões da correção 09
-- (execute só para authenticated). Reforçamos aqui por segurança.
revoke execute on function
  registrar_entrada_estoque(uuid, uuid, integer, text, text, text),
  transferir_estoque(uuid, uuid, uuid, integer, text, text),
  registrar_entrega(uuid, uuid, jsonb, text),
  registrar_troca_devolucao(uuid, uuid, text, jsonb)
from public, anon;

grant execute on function
  registrar_entrada_estoque(uuid, uuid, integer, text, text, text),
  transferir_estoque(uuid, uuid, uuid, integer, text, text),
  registrar_entrega(uuid, uuid, jsonb, text),
  registrar_troca_devolucao(uuid, uuid, text, jsonb)
to authenticated;
