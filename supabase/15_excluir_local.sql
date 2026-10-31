-- Exclusão de local de estoque — EPI-327 (pedido do Victor em 31/10/2026).
--
-- Regra: só pode ser EXCLUÍDO o local que está INATIVO, SEM ESTOQUE e que
-- NUNCA FOI USADO (sem entradas, saídas, transferências ou entregas).
--
-- - "Inativo": evita apagar sem querer um local em uso. Primeiro inativa
--   (EPI-326), depois exclui. Este gatilho garante isso no banco.
-- - "Sem estoque": um local inativo já não pode ter saldo (correção 13),
--   mas conferimos de novo aqui.
-- - "Nunca usado": quem garante são as chaves estrangeiras com
--   ON DELETE RESTRICT da correção 10. Local com histórico NÃO é apagado
--   (RN-004, exclusão lógica): ele fica inativo para sempre.
--
-- Na prática, excluir serve para corrigir local cadastrado por engano.
-- Quem pode excluir: administrador e almoxarife (policy da correção 09).
--
-- Teste: tests/banco/teste_excluir_local.sql (antes: 1x FALHOU; depois: 4x OK).

create function interno.conferir_exclusao_local()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'inativo' then
    raise exception 'Inative o local antes de excluir.' using errcode = 'P0001';
  end if;

  if exists (select 1 from saldo_estoque where local_id = old.id and saldo > 0) then
    raise exception 'Este local ainda tem EPI em estoque e não pode ser excluído.' using errcode = 'P0001';
  end if;

  -- Linhas de saldo zeradas não são histórico: podem sair junto.
  -- (Se o local tiver movimentação, a exclusão é barrada pela chave
  -- estrangeira logo em seguida e tudo é desfeito.)
  delete from saldo_estoque where local_id = old.id and saldo = 0;

  return old;
end;
$$;

revoke execute on function interno.conferir_exclusao_local() from public, anon, authenticated;

create trigger locais_estoque_conferir_exclusao
  before delete on locais_estoque
  for each row
  execute function interno.conferir_exclusao_local();
