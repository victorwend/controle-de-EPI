-- Usuários e permissões — EPI-329 (RN-011, RN-013).
--
-- Decisões do Victor (31/10/2026):
--  - Modelo de permissão "Perfil + obras": cada usuário tem 1 perfil
--    (o que ele pode FAZER) e uma lista de obras liberadas (ONDE ele pode
--    fazer). Administrador vale para todas as obras (ver correção 16).
--  - O perfil OPERADOR sai do sistema. Quem tinha esse perfil fica
--    INATIVO até o administrador escolher um perfil novo para ele.
--
-- O que esta correção faz:
--  A) Inativa os operadores e impede usar "operador" em usuário ativo.
--  B) Usuário INATIVO perde o acesso (RN-013). Antes, inativar não
--     mudava nada: perfil_atual() e empresa_atual() ignoravam o status.
--  C) Travas de segurança ao editar usuários (pelo sistema):
--     - ninguém altera o próprio perfil nem inativa o próprio acesso
--       (assim a empresa nunca fica sem administrador: quem faz a
--       mudança é sempre um administrador ativo que continua ativo);
--     - usuário não é excluído, só inativado (ele aparece no histórico
--       de entregas e movimentações como responsável);
--     - id, empresa e e-mail não mudam (o e-mail é o do login).
--  D) Função atualizar_permissoes_usuario: troca perfil, situação e
--     obras de uma vez só (tudo ou nada).
--
-- Teste: tests/banco/teste_usuarios_permissoes.sql
--        (antes: 8x FALHOU; depois: 10x OK).

-- =====================================================================
-- A) Fim do perfil Operador
-- =====================================================================
-- O Postgres não remove um valor de enum com facilidade, então o valor
-- 'operador' continua existindo no tipo, mas só pode ficar em usuário
-- INATIVO (o histórico mostra quem era operador).

update usuarios set status = 'inativo' where perfil = 'operador' and status = 'ativo';

alter table usuarios
  add constraint usuarios_operador_so_inativo
  check (perfil <> 'operador' or status = 'inativo');

-- O padrão era 'operador'. Agora quem cria usuário precisa dizer o perfil
-- (a Edge Function convidar-usuario e o cadastro da empresa já dizem).
alter table usuarios alter column perfil drop default;

-- =====================================================================
-- B) Usuário inativo perde o acesso (RN-013)
-- =====================================================================
-- Todas as regras (policies) e funções de negócio usam estas duas
-- funções. Para um usuário inativo elas passam a devolver NULL, e aí
-- nenhuma regra deixa ver nem fazer nada.

create or replace function empresa_atual()
returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios where id = auth.uid() and status = 'ativo';
$$;

create or replace function perfil_atual()
returns perfil_usuario
language sql stable security definer set search_path = public as $$
  select perfil from usuarios where id = auth.uid() and status = 'ativo';
$$;

-- Exceção: cada um continua vendo o PRÓPRIO cadastro, para a tela
-- conseguir mostrar "seu acesso está inativo" em vez de uma tela vazia.
create policy "usuarios: cada um vê o próprio cadastro"
  on usuarios for select
  using (id = auth.uid());

-- =====================================================================
-- C) Travas ao editar usuários pelo sistema
-- =====================================================================
-- Valem só para quem usa o sistema (papel "authenticated"). O SQL Editor
-- (dono do banco) e a Edge Function (service_role) não passam por elas,
-- para o suporte conseguir corrigir um caso de emergência.

create function interno.proteger_usuarios()
returns trigger
language plpgsql as $$
begin
  if current_user <> 'authenticated' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Usuário não é excluído, porque aparece no histórico. Inative o acesso dele.';
  end if;

  if new.id <> old.id or new.empresa_id <> old.empresa_id or new.email <> old.email then
    raise exception 'Só o nome, o perfil e a situação do usuário podem ser alterados.';
  end if;

  if old.id = auth.uid() and (new.perfil <> old.perfil or new.status <> old.status) then
    raise exception 'Você não pode mudar o seu próprio perfil nem inativar o seu próprio acesso. Peça a outro administrador.';
  end if;

  if new.perfil = 'operador' and new.status = 'ativo' then
    raise exception 'O perfil Operador foi removido. Escolha outro perfil para este usuário.';
  end if;

  return new;
end;
$$;

create trigger proteger_usuarios
  before update or delete on usuarios
  for each row execute function interno.proteger_usuarios();

-- =====================================================================
-- D) Salvar as permissões de um usuário de uma vez
-- =====================================================================
-- SECURITY INVOKER (o padrão): roda com as permissões de quem chamou,
-- então as policies de RLS e as travas do item C continuam valendo.
-- A vantagem de ser uma função é ser TUDO OU NADA: se a troca das obras
-- der erro, a troca do perfil também é desfeita.

create function atualizar_permissoes_usuario(
  p_usuario_id uuid,
  p_perfil perfil_usuario,
  p_ativo boolean,
  p_obra_ids uuid[]
)
returns void
language plpgsql set search_path = public as $$
declare
  v_obras uuid[] := coalesce(p_obra_ids, array[]::uuid[]);
begin
  if perfil_atual() is distinct from 'administrador' then
    raise exception 'Só o administrador gerencia usuários e permissões.' using errcode = '42501';
  end if;

  if not exists (select 1 from usuarios where id = p_usuario_id and empresa_id = empresa_atual()) then
    raise exception 'Usuário não encontrado.' using errcode = '42501';
  end if;

  if p_perfil = 'operador' then
    raise exception 'O perfil Operador foi removido. Escolha outro perfil para este usuário.';
  end if;

  if exists (
    select 1 from unnest(v_obras) as pedido(id)
     where not exists (select 1 from obras o where o.id = pedido.id and o.empresa_id = empresa_atual())
  ) then
    raise exception 'Obra não encontrada nesta empresa.' using errcode = '42501';
  end if;

  update usuarios
     set perfil = p_perfil,
         status = case when p_ativo then 'ativo' else 'inativo' end
   where id = p_usuario_id;

  delete from usuario_obras
   where usuario_id = p_usuario_id and not (obra_id = any (v_obras));

  insert into usuario_obras (usuario_id, obra_id)
  select p_usuario_id, pedido.id from unnest(v_obras) as pedido(id)
  on conflict do nothing;
end;
$$;

revoke execute on function atualizar_permissoes_usuario(uuid, perfil_usuario, boolean, uuid[]) from public, anon;
grant execute on function atualizar_permissoes_usuario(uuid, perfil_usuario, boolean, uuid[]) to authenticated;
