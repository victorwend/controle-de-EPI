-- Validade do CA opcional — EPI-324 (decisão do Victor em 31/10/2026).
--
-- Antes: epis.validade_ca era obrigatória (NOT NULL). Não dava para
-- cadastrar um EPI sem saber a data de validade do CA.
--
-- Agora: o campo pode ficar vazio. A tela de EPIs mostra esses casos como
-- "Sem validade", para ninguém confundir com CA válido.
--
-- ATENÇÃO (decisão provisória): a NR-6 exige que o EPI entregue tenha CA
-- válido. Sem a data, o sistema não consegue avisar quando o CA vencer.
-- Rever antes do piloto e antes da central de alertas (Sprint 7).
--
-- Para voltar a exigir no futuro (depois de preencher as datas que faltam):
--   alter table epis alter column validade_ca set not null;
--
-- Teste: tests/banco/teste_validade_ca.sql (antes: 1x FALHOU; depois: 2x OK).

alter table epis alter column validade_ca drop not null;
