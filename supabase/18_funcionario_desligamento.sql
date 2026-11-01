-- Funcionário desligado — EPI-330 (RN-019, RN-044).
--
-- A coluna funcionarios.status ('ativo'/'inativo') já existia desde a
-- correção 04, mas o sistema não tinha como usá-la: não havia botão para
-- inativar nem lugar para guardar QUANDO e POR QUE a pessoa saiu.
--
-- Funcionário não é apagado (correção 10: ele tem histórico de entregas,
-- que a ficha de EPI precisa guardar). Quem sai da empresa é INATIVADO.
-- Inativo não recebe EPI (correção 14) e some da lista na tela.
--
-- O que esta correção faz:
--  A) Colunas data_desligamento e motivo_desligamento.
--  B) Regras: só inativo tem data de desligamento; a data não pode ser
--     antes da admissão.
--  C) Gatilho: ao inativar sem data, grava a data de hoje; ao reativar,
--     limpa a data e o motivo.
--
-- Quem pode inativar/reativar: só o Administrador (regra
-- "funcionarios: administrador gerencia", correção 09). Nada muda nisso.
--
-- Teste: tests/banco/teste_funcionario_inativo.sql
--        (antes: 4x FALHOU; depois: 6x OK).

-- A) Colunas ----------------------------------------------------------
alter table funcionarios
  add column data_desligamento date,
  add column motivo_desligamento text;

-- B) Regras -----------------------------------------------------------
alter table funcionarios
  add constraint funcionarios_desligamento_so_inativo
    check (status = 'inativo' or (data_desligamento is null and motivo_desligamento is null)),
  add constraint funcionarios_desligamento_depois_admissao
    check (data_desligamento is null or data_admissao is null or data_desligamento >= data_admissao);

-- C) Gatilho ----------------------------------------------------------
-- Roda ANTES de gravar, então as regras do item B já conferem a linha
-- com a data preenchida (ou limpa).
create function interno.ajustar_desligamento()
returns trigger
language plpgsql as $$
begin
  if new.status = 'inativo' and new.data_desligamento is null then
    new.data_desligamento := current_date;
  end if;

  if tg_op = 'UPDATE' and new.status = 'ativo' and old.status = 'inativo' then
    new.data_desligamento := null;
    new.motivo_desligamento := null;
  end if;

  return new;
end;
$$;

create trigger ajustar_desligamento
  before insert or update of status, data_desligamento on funcionarios
  for each row execute function interno.ajustar_desligamento();
