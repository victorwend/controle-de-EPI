-- Sprint 3 — adiciona plano contratado à empresa. Selecionado no cadastro
-- (frontend/src/pages/Cadastro.jsx) sem checkout de verdade por enquanto —
-- só guarda a escolha para quando a cobrança for implementada.

alter table empresas
  add column if not exists plano text not null default 'starter'
  check (plano in ('starter', 'profissional', 'empresarial'));

-- Precisa recriar a função porque a lista de parâmetros mudou (Postgres não
-- permite alterar assinatura com CREATE OR REPLACE).
drop function if exists criar_empresa_com_administrador(text, text, text);

create function criar_empresa_com_administrador(
  p_razao_social text,
  p_cnpj text,
  p_nome_responsavel text,
  p_plano text default 'starter'
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if exists (select 1 from usuarios where id = auth.uid()) then
    raise exception 'Este usuário já pertence a uma empresa.';
  end if;

  if p_plano not in ('starter', 'profissional', 'empresarial') then
    raise exception 'Plano inválido.';
  end if;

  insert into empresas (razao_social, cnpj, plano)
    values (p_razao_social, p_cnpj, p_plano)
    returning id into v_empresa_id;

  insert into usuarios (id, empresa_id, nome_completo, email, perfil)
    values (auth.uid(), v_empresa_id, p_nome_responsavel, auth.jwt() ->> 'email', 'administrador');

  return v_empresa_id;
end;
$$;
