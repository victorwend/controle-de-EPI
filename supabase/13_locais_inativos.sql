-- Regras de locais de estoque inativos — EPI-326.
--
-- Com a tela de gerenciar locais, passa a ser comum inativar um local
-- (ex.: container de uma obra que terminou). Duas regras faltavam:
--
-- A) Não deixar inativar um local que AINDA TEM EPI em estoque.
--    Senão o saldo "some" das telas (que só mostram locais ativos) e
--    ninguém mais consegue entregar ou transferir esses EPIs.
--    Para inativar, primeiro transfira o saldo para outro local.
--
-- B) Local inativo não recebe nem entrega EPI. As telas já escondem os
--    inativos, mas a regra precisa estar no banco também (a tela pode ser
--    contornada chamando a API direto). Por isso a conferência da
--    correção 11 passa a exigir status = 'ativo'.
--
-- Teste: tests/banco/teste_locais.sql (antes: 2x FALHOU; depois: 5x OK).

-- =====================================================================
-- A) Bloqueio de inativação com saldo
-- =====================================================================

create function interno.impedir_inativar_local_com_saldo()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_total integer;
begin
  if new.status = 'inativo' and old.status is distinct from 'inativo' then
    select coalesce(sum(saldo), 0) into v_total
      from saldo_estoque
     where local_id = new.id and saldo > 0;

    if v_total > 0 then
      raise exception 'Este local ainda tem % EPI(s) em estoque. Transfira o saldo para outro local antes de inativar.', v_total
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function interno.impedir_inativar_local_com_saldo() from public, anon, authenticated;

create trigger locais_estoque_impedir_inativar_com_saldo
  before update of status on locais_estoque
  for each row
  execute function interno.impedir_inativar_local_com_saldo();

-- =====================================================================
-- B) Operações só em local ativo (substitui a versão da correção 11)
-- =====================================================================

create or replace function interno.exigir_local_da_empresa(p_local_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from locais_estoque
     where id = p_local_id
       and empresa_id = empresa_atual()
       and status = 'ativo'
  ) then
    raise exception 'Local de estoque não encontrado nesta empresa ou inativo.' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function interno.exigir_local_da_empresa(uuid) from public, anon, authenticated;
