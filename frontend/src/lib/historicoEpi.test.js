// Testes do histórico de EPIs (EPI-342). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparTrocasPorFuncionario,
  descreverTroca,
  filtrarHistorico,
  montarHistorico,
} from "./historicoEpi.js";

const ENTREGAS = [
  {
    id: 1,
    quantidade: 2,
    epis: { nome: "Luva", ca: "456" },
    entregas: { created_at: "2026-10-01T10:00:00Z", motivo: "admissao", comprovante: "C-1", aceite_metodo: "confirmacao_responsavel", usuarios: { nome_completo: "Victor" }, obras: { nome: "Obra 1654" } },
  },
];
const TROCAS = [
  { id: 7, funcionario_id: "f1", created_at: "2026-10-10T10:00:00Z", quantidade: 1, acao: "troca", destino: "descarte", motivo: "Rasgou", epis: { nome: "Luva", ca: "456" }, obras: null },
  { id: 8, funcionario_id: "f1", created_at: "2026-10-20T10:00:00Z", quantidade: 1, acao: "devolucao", destino: "perda", motivo: "Desligamento: Fim de contrato", epis: { nome: "Luva", ca: "456" } },
  { id: 9, funcionario_id: "f2", created_at: "2026-10-15T10:00:00Z", quantidade: 1, acao: "devolucao", destino: "estoque", motivo: null, epis: { nome: "Capacete", ca: "1" } },
];

test("descreve trocas, devoluções e baixas", () => {
  assert.equal(descreverTroca("troca", "descarte").categoria, "troca");
  assert.match(descreverTroca("troca", "perda").detalhe, /perdido/);
  assert.deepEqual(descreverTroca("devolucao", "estoque").categoria, "devolucao");
  assert.equal(descreverTroca("devolucao", "descarte").categoria, "baixa");
  assert.equal(descreverTroca("devolucao", "perda").detalhe, "Perda / extravio");
});

test("linha do tempo junta tudo, do mais recente para o mais antigo", () => {
  const linhas = montarHistorico(ENTREGAS, TROCAS.filter((t) => t.funcionario_id === "f1"));
  assert.deepEqual(
    linhas.map((linha) => `${linha.tipo}:${linha.sinal}${linha.quantidade}`),
    ["Baixa:−1", "Troca:±1", "Entrega:+2"]
  );
  assert.equal(linhas[2].detalhe, "Motivo: Admissão");
  assert.equal(linhas[2].obra, "Obra 1654");
  assert.equal(linhas[1].obra, "Sede");
  assert.equal(linhas[0].observacao, "Desligamento: Fim de contrato");
});

test("filtros por categoria", () => {
  const linhas = montarHistorico(ENTREGAS, TROCAS);
  assert.equal(filtrarHistorico(linhas, "").length, 4);
  assert.equal(filtrarHistorico(linhas, "entrega").length, 1);
  assert.equal(filtrarHistorico(linhas, "troca").length, 1);
  assert.equal(filtrarHistorico(linhas, "devolucao").length, 1);
  assert.equal(filtrarHistorico(linhas, "baixa").length, 1);
});

test("agrupa trocas por funcionário", () => {
  const grupos = agruparTrocasPorFuncionario(TROCAS);
  assert.equal(grupos.f1.length, 2);
  assert.equal(grupos.f2.length, 1);
});

test("EPI-345: histórico de vários funcionários, com o nome de cada um", async () => {
  const { montarHistoricoDeVarios } = await import("./historicoEpi.js");
  const funcionarios = [
    { id: "f1", nome: "Ana", matricula: "1" },
    { id: "f2", nome: "Bruno", matricula: "2" },
    { id: "f3", nome: "Caio", matricula: "3" },
  ];
  const itens = { f1: ENTREGAS };
  const trocas = { f1: TROCAS.filter((t) => t.funcionario_id === "f1"), f2: TROCAS.filter((t) => t.funcionario_id === "f2") };
  const linhas = montarHistoricoDeVarios(funcionarios, itens, trocas);
  assert.equal(linhas.length, 4); // f1: 1 entrega + 2 trocas/baixas; f2: 1 devolução; f3: nada
  assert.deepEqual(
    linhas.map((l) => `${l.funcionarioNome}:${l.categoria}`),
    ["Ana:baixa", "Bruno:devolucao", "Ana:troca", "Ana:entrega"]
  );
  assert.equal(new Set(linhas.map((l) => l.id)).size, 4);
});
