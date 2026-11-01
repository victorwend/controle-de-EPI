// Testes da lista de funcionários e do desligamento (EPI-330). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { contarInativos, filtrarFuncionarios, hojeIso, textoMotivo, validarDesligamento } from "./funcionarios.js";

const LISTA = [
  { nome: "João da Silva", matricula: "100", funcao: "Servente", obra_id: "o1", status: "ativo" },
  { nome: "José Araújo", matricula: "200", funcao: "Pedreiro", obra_id: "o2", status: "inativo" },
  { nome: "Maria Souza", matricula: "300", funcao: "Armadora", obra_id: "o1", status: "ativo" },
];

test("inativo some da lista e da busca", () => {
  assert.deepEqual(filtrarFuncionarios(LISTA).map((f) => f.matricula), ["100", "300"]);
  assert.equal(filtrarFuncionarios(LISTA, { busca: "José" }).length, 0);
  assert.equal(filtrarFuncionarios(LISTA, { busca: "200" }).length, 0);
});

test("inativo aparece com 'Mostrar inativos'", () => {
  assert.equal(filtrarFuncionarios(LISTA, { mostrarInativos: true }).length, 3);
  assert.deepEqual(
    filtrarFuncionarios(LISTA, { busca: "jose", mostrarInativos: true }).map((f) => f.matricula),
    ["200"]
  );
  assert.equal(contarInativos(LISTA), 1);
});

test("busca ignora acento e maiúscula; filtro por obra continua valendo", () => {
  assert.equal(filtrarFuncionarios(LISTA, { busca: "JOAO" }).length, 1);
  assert.equal(filtrarFuncionarios(LISTA, { busca: "armad" }).length, 1);
  assert.deepEqual(filtrarFuncionarios(LISTA, { obraId: "o1" }).map((f) => f.matricula), ["100", "300"]);
  assert.equal(filtrarFuncionarios(LISTA, { obraId: "o2" }).length, 0);
});

test("hojeIso usa a data local", () => {
  assert.equal(hojeIso(new Date(2026, 10, 1, 23, 30)), "2026-11-01");
});

test("validação do desligamento", () => {
  const base = { data: "2026-10-31", motivo: "Fim de contrato", dataAdmissao: "2026-01-10", hoje: "2026-11-01" };
  assert.equal(validarDesligamento(base), "");
  assert.match(validarDesligamento({ ...base, data: "" }), /Informe a data/);
  assert.match(validarDesligamento({ ...base, data: "2026-11-02" }), /futuro/);
  assert.match(validarDesligamento({ ...base, data: "2026-01-09" }), /antes da admissão/);
  assert.match(validarDesligamento({ ...base, motivo: "" }), /motivo/);
  assert.match(validarDesligamento({ ...base, motivo: "Outro", motivoOutro: " " }), /Descreva/);
  assert.equal(validarDesligamento({ ...base, motivo: "Outro", motivoOutro: "Mudou de cidade" }), "");
  assert.equal(textoMotivo("Outro", " Mudou de cidade "), "Mudou de cidade");
  assert.equal(textoMotivo("Aposentadoria", "x"), "Aposentadoria");
});
