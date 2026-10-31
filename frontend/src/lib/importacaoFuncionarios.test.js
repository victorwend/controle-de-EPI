// Testes da importação de funcionários (EPI-319). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analisarPlanilha,
  converterData,
  emLotes,
  LIMITE_LINHAS,
  mapearCabecalho,
  simplificar,
} from "./importacaoFuncionarios.js";

const CABECALHO = [
  "Matrícula *",
  "Nome completo *",
  "Obra *",
  "CPF",
  "Função",
  "Setor",
  "Data de admissão (dd/mm/aaaa)",
  "Observações",
];

const OBRAS = [
  { id: "obra-1", nome: "Residencial Águas Claras", codigo: "OB-01" },
  { id: "obra-2", nome: "Ponte do Rio", codigo: null },
];

function analisar(linhas, matriculasExistentes = []) {
  return analisarPlanilha([CABECALHO, ...linhas], {
    obras: OBRAS,
    matriculasExistentes: new Set(matriculasExistentes),
  });
}

test("simplificar ignora acento, maiúscula, asterisco e parênteses", () => {
  assert.equal(simplificar("  Data de Admissão (dd/mm/aaaa) "), "data de admissao");
  assert.equal(simplificar("Matrícula *"), "matricula");
});

test("mapearCabecalho acha as colunas mesmo fora de ordem", () => {
  const { posicoes, faltando } = mapearCabecalho(["obra", "NOME COMPLETO", "matricula"]);
  assert.deepEqual(faltando, []);
  assert.equal(posicoes.obra, 0);
  assert.equal(posicoes.nome, 1);
  assert.equal(posicoes.matricula, 2);
});

test("mapearCabecalho avisa quais colunas obrigatórias faltam", () => {
  const { faltando } = mapearCabecalho(["Nome completo", "CPF"]);
  assert.deepEqual(faltando, ["Matrícula", "Obra"]);
});

test("planilha sem colunas obrigatórias gera erro geral", () => {
  const r = analisarPlanilha([["Nome"], ["Fulano"]], { obras: OBRAS });
  assert.match(r.erroGeral, /colunas obrigatórias/);
});

test("planilha só com cabeçalho gera erro geral", () => {
  const r = analisar([["", "", ""]]);
  assert.match(r.erroGeral, /nenhum funcionário/);
});

test("linha válida vira registro pronto para o banco", () => {
  const r = analisar([
    ["00487", "  João   da Silva ", "residencial aguas claras", "52998224725", "Pedreiro", "", "15/01/2026", ""],
  ]);
  assert.equal(r.erroGeral, "");
  assert.equal(r.novos.length, 1);
  assert.deepEqual(r.novos[0].registro, {
    matricula: "00487",
    nome: "João da Silva",
    obra_id: "obra-1",
    cpf: "529.982.247-25",
    funcao: "Pedreiro",
    setor: null,
    data_admissao: "2026-01-15",
    observacoes: null,
  });
  assert.equal(r.novos[0].linha, 2);
});

test("obra pode ser informada pelo código", () => {
  const r = analisar([["1", "Ana", "ob-01"]]);
  assert.equal(r.novos[0].registro.obra_id, "obra-1");
});

test("matrícula já cadastrada é ignorada, não é erro", () => {
  const r = analisar([["100", "Ana", "Ponte do Rio"], ["200", "Bia", "Ponte do Rio"]], ["100"]);
  assert.equal(r.jaCadastrados.length, 1);
  assert.equal(r.jaCadastrados[0].matricula, "100");
  assert.equal(r.novos.length, 1);
  assert.equal(r.comErro.length, 0);
});

test("matrícula repetida na planilha: fica a primeira, a outra é ignorada", () => {
  const r = analisar([
    ["300", "Carlos", "Ponte do Rio"],
    ["300", "Carlos de novo", "Ponte do Rio"],
  ]);
  assert.equal(r.novos.length, 1);
  assert.equal(r.repetidos.length, 1);
  assert.equal(r.repetidos[0].linha, 3);
  assert.equal(r.repetidos[0].primeiraLinha, 2);
});

test("linhas com problema vão para comErro com todos os motivos", () => {
  const r = analisar([
    ["", "", "Obra que não existe", "123", "", "", "31/02/2026"],
  ]);
  assert.equal(r.novos.length, 0);
  assert.equal(r.comErro.length, 1);
  const motivos = r.comErro[0].motivos.join(" | ");
  assert.match(motivos, /matrícula em branco/);
  assert.match(motivos, /nome em branco/);
  assert.match(motivos, /não encontrada/);
  assert.match(motivos, /CPF inválido/);
  assert.match(motivos, /não existe no calendário/);
});

test("linhas totalmente vazias no meio são puladas", () => {
  const r = analisar([["1", "Ana", "Ponte do Rio"], [], ["", "", ""], ["2", "Bia", "Ponte do Rio"]]);
  assert.equal(r.novos.length, 2);
  assert.equal(r.novos[1].linha, 5);
});

test("matrícula que o Excel leu como número vira texto", () => {
  const r = analisar([[487, "Ana", "Ponte do Rio"]]);
  assert.equal(r.novos[0].registro.matricula, "487");
});

test("limite de linhas por envio", () => {
  const linhas = Array.from({ length: LIMITE_LINHAS + 1 }, (_, i) => [String(i), "Fulano", "Ponte do Rio"]);
  const r = analisar(linhas);
  assert.match(r.erroGeral, /limite/);
});

test("converterData aceita texto dd/mm/aaaa e número do Excel", () => {
  assert.deepEqual(converterData("15/01/2026"), { valor: "2026-01-15" });
  assert.deepEqual(converterData("5-3-2025"), { valor: "2025-03-05" });
  assert.deepEqual(converterData(46037), { valor: "2026-01-15" }); // 15/01/2026 no Excel
  assert.deepEqual(converterData(""), { valor: null });
});

test("converterData recusa formato errado, data impossível e futuro", () => {
  assert.ok(converterData("2026-01-15").erro);
  assert.ok(converterData("30/02/2026").erro);
  assert.ok(converterData("01/01/2999").erro);
});

test("emLotes divide a lista", () => {
  assert.deepEqual(emLotes([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
