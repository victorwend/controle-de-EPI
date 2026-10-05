-- Proteção do histórico — problema 3 do diagnóstico de 22/09/2026.
--
-- Problema: várias chaves estrangeiras usavam ON DELETE CASCADE ou
-- ON DELETE SET NULL. Apagar um funcionário apagava junto as entregas,
-- a posse e as trocas dele; apagar um EPI ou um local apagava o saldo e
-- as movimentações, ou deixava a movimentação sem local.
-- Isso destrói o histórico exigido pela NR-6 e contraria o ADR-009
-- (histórico imutável) e o RNF-040 (correções não apagam o registro).
--
-- Solução: nessas ligações, trocar para ON DELETE RESTRICT. O banco passa
-- a recusar a exclusão de um cadastro que já tem histórico. Cadastros
-- sem histórico continuam podendo ser apagados.
-- Para "tirar de uso" um funcionário com histórico, use status = 'inativo'.
--
-- Fora do escopo (mantido de propósito):
--   - empresa_id ... ON DELETE CASCADE: excluir a empresa inteira (tenant).
--   - entrega_itens.entrega_id CASCADE: entregas já não podem ser apagadas
--     pelo navegador (correção 09).
--   - obra_id / responsavel_id SET NULL em funcionarios e locais_estoque:
--     são dados de cadastro, não histórico.
--
-- Teste: tests/banco/teste_historico.sql (antes: 3x FALHOU; depois: 5x OK).

-- Funcionário -> entregas, posse e trocas
alter table entregas
  drop constraint entregas_funcionario_id_fkey,
  add constraint entregas_funcionario_id_fkey
    foreign key (funcionario_id) references funcionarios(id) on delete restrict;

alter table posse_epi_funcionario
  drop constraint posse_epi_funcionario_funcionario_id_fkey,
  add constraint posse_epi_funcionario_funcionario_id_fkey
    foreign key (funcionario_id) references funcionarios(id) on delete restrict;

alter table trocas_devolucoes_itens
  drop constraint trocas_devolucoes_itens_funcionario_id_fkey,
  add constraint trocas_devolucoes_itens_funcionario_id_fkey
    foreign key (funcionario_id) references funcionarios(id) on delete restrict;

-- EPI -> saldo, movimentações e posse
alter table saldo_estoque
  drop constraint saldo_estoque_epi_id_fkey,
  add constraint saldo_estoque_epi_id_fkey
    foreign key (epi_id) references epis(id) on delete restrict;

alter table movimentacoes_estoque
  drop constraint movimentacoes_estoque_epi_id_fkey,
  add constraint movimentacoes_estoque_epi_id_fkey
    foreign key (epi_id) references epis(id) on delete restrict;

alter table posse_epi_funcionario
  drop constraint posse_epi_funcionario_epi_id_fkey,
  add constraint posse_epi_funcionario_epi_id_fkey
    foreign key (epi_id) references epis(id) on delete restrict;

-- Local de estoque -> saldo e movimentações
alter table saldo_estoque
  drop constraint saldo_estoque_local_id_fkey,
  add constraint saldo_estoque_local_id_fkey
    foreign key (local_id) references locais_estoque(id) on delete restrict;

alter table movimentacoes_estoque
  drop constraint movimentacoes_estoque_local_origem_id_fkey,
  add constraint movimentacoes_estoque_local_origem_id_fkey
    foreign key (local_origem_id) references locais_estoque(id) on delete restrict;

alter table movimentacoes_estoque
  drop constraint movimentacoes_estoque_local_destino_id_fkey,
  add constraint movimentacoes_estoque_local_destino_id_fkey
    foreign key (local_destino_id) references locais_estoque(id) on delete restrict;
