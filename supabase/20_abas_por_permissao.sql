-- Abas do menu liberadas por perfil — EPI-333.
--
-- Pedido do Victor (01/11/2026): "nenhuma aba que não seja liberada nas
-- configurações de perfil". Cada aba do menu ganha uma caixinha por perfil
-- em Usuários e permissões (mesma tabela permissoes_perfil da correção 19).
--
-- Abas configuráveis (prefixo "aba_"):
--   aba_entregas, aba_funcionarios, aba_estoque, aba_epis, aba_obras,
--   aba_cadastros, aba_relatorios
-- Fixas: "Visão geral" (todos) e "Usuários e permissões" / "Configurações"
-- (só o Administrador).
--
-- Padrão: TODAS as abas liberadas para os 3 perfis, que é o que valia
-- antes. Nada muda até o Administrador desmarcar.
--
-- Regra de coerência: quem recebe uma AÇÃO recebe a ABA dela (ex.: quem
-- pode entregar EPI precisa ver a aba Entregas). A função de salvar
-- acrescenta a aba sozinha.
--
-- Atenção: a aba controla o que APARECE (menu e telas). As regras de
-- gravação continuam no banco (correção 19). A leitura dos dados segue
-- as obras liberadas (correção 16), porque uma tela usa dados de outras
-- (a entrega lê funcionários e estoque, por exemplo).
--
-- Teste: tests/banco/teste_abas_permissoes.sql (antes: 4x FALHOU; depois: 5x OK).

-- A) Novas ações aceitas na tabela -------------------------------------
alter table permissoes_perfil drop constraint permissoes_perfil_acao_check;
alter table permissoes_perfil add constraint permissoes_perfil_acao_check
  check (acao in ('gerenciar_epis', 'gerenciar_estoque', 'registrar_entregas',
                  'gerenciar_funcionarios', 'gerenciar_obras', 'ver_todas_obras',
                  'aba_entregas', 'aba_funcionarios', 'aba_estoque', 'aba_epis',
                  'aba_obras', 'aba_cadastros', 'aba_relatorios'));

-- B) Abas liberadas para quem já existe (padrão = tudo liberado) -------
-- Só acrescenta as abas: não mexe nas caixinhas que o Administrador já
-- configurou na correção 19.
insert into permissoes_perfil (empresa_id, perfil, acao)
select e.id, p.perfil::perfil_usuario, a.acao
  from empresas e
 cross join (values ('almoxarife'), ('tecnico_seguranca'), ('gestor')) as p(perfil)
 cross join (values ('aba_entregas'), ('aba_funcionarios'), ('aba_estoque'), ('aba_epis'),
                    ('aba_obras'), ('aba_cadastros'), ('aba_relatorios')) as a(acao)
on conflict do nothing;

-- C) Empresa nova: padrão da 19 + todas as abas ------------------------
create or replace function interno.criar_permissoes_padrao(p_empresa_id uuid)
returns void
language sql as $$
  insert into permissoes_perfil (empresa_id, perfil, acao) values
    (p_empresa_id, 'tecnico_seguranca', 'gerenciar_epis'),
    (p_empresa_id, 'almoxarife', 'gerenciar_estoque'),
    (p_empresa_id, 'almoxarife', 'registrar_entregas')
  on conflict do nothing;

  insert into permissoes_perfil (empresa_id, perfil, acao)
  select p_empresa_id, p.perfil::perfil_usuario, a.acao
    from (values ('almoxarife'), ('tecnico_seguranca'), ('gestor')) as p(perfil)
   cross join (values ('aba_entregas'), ('aba_funcionarios'), ('aba_estoque'), ('aba_epis'),
                      ('aba_obras'), ('aba_cadastros'), ('aba_relatorios')) as a(acao)
  on conflict do nothing;
$$;

-- D) Salvar: a ação leva a sua aba junto --------------------------------
create or replace function salvar_permissoes_perfil(p_perfil perfil_usuario, p_acoes text[])
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

  if 'gerenciar_obras' = any (v_acoes) and not ('ver_todas_obras' = any (v_acoes)) then
    raise exception 'Para cadastrar obras, o perfil também precisa de "Ver todas as obras".';
  end if;

  -- Cada ação traz a aba onde ela é feita.
  if 'gerenciar_epis' = any (v_acoes)         then v_acoes := array_append(v_acoes, 'aba_epis'); end if;
  if 'gerenciar_estoque' = any (v_acoes)      then v_acoes := array_append(v_acoes, 'aba_estoque'); end if;
  if 'registrar_entregas' = any (v_acoes)     then v_acoes := array_append(v_acoes, 'aba_entregas'); end if;
  if 'gerenciar_funcionarios' = any (v_acoes) then v_acoes := array_append(v_acoes, 'aba_funcionarios'); end if;
  if 'gerenciar_obras' = any (v_acoes)        then v_acoes := array_append(v_acoes, 'aba_obras'); end if;

  delete from permissoes_perfil where empresa_id = empresa_atual() and perfil = p_perfil;

  insert into permissoes_perfil (empresa_id, perfil, acao)
  select distinct empresa_atual(), p_perfil, acao from unnest(v_acoes) as acao;
end;
$$;
