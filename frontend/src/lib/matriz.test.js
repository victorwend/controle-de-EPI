// Testes da Matriz EPI x Função (EPI-280). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deBanco,
  funcaoJaExiste,
  itensSugeridos,
  normalizarNomeFuncao,
  paraSalvar,
  textoPeriodicidade,
  validarItensMatriz,
  validarNomeFuncao,
} from "./matriz.js";

test("nome da função é arrumado e comparado sem maiúscula", () => {
  assert.equal(normalizarNomeFuncao("  servente   de  obra "), "servente de obra");
  const funcoes = [{ id: "1", nome: "Servente" }];
  assert.equal(funcaoJaExiste(funcoes, " SERVENTE "), true);
  assert.equal(funcaoJaExiste(funcoes, "Servente", "1"), false); // renomear a própria
  assert.match(validarNomeFuncao(funcoes, "   "), /Digite/);
  assert.match(validarNomeFuncao(funcoes, "servente"), /Já existe/);
  assert.equal(validarNomeFuncao(funcoes, "Pedreiro"), "");
});

test("validação dos itens da matriz", () => {
  const ok = [{ epiId: "a", quantidade: 2, obrigatorio: true, periodicidadeMeses: "" }];
  assert.equal(validarItensMatriz(ok), "");
  assert.equal(validarItensMatriz([]), "");
  assert.match(validarItensMatriz([{ epiId: "", quantidade: 1 }]), /Linha 1: escolha o EPI/);
  assert.match(validarItensMatriz([{ epiId: "a", quantidade: 0 }]), /maior que zero/);
  assert.match(validarItensMatriz([{ epiId: "a", quantidade: 1.5 }]), /inteiro/);
  assert.match(
    validarItensMatriz([
      { epiId: "a", quantidade: 1 },
      { epiId: "a", quantidade: 1 },
    ]),
    /Linha 2: este EPI já está/
  );
  assert.match(validarItensMatriz([{ epiId: "a", quantidade: 1, periodicidadeMeses: "-3" }]), /meses/);
});

test("conversão para o banco e de volta", () => {
  const itens = [
    { epiId: "a", quantidade: "2", obrigatorio: true, periodicidadeMeses: "6" },
    { epiId: "b", quantidade: 1, obrigatorio: false, periodicidadeMeses: "" },
  ];
  const salvo = paraSalvar(itens);
  assert.deepEqual(salvo, [
    { epi_id: "a", quantidade: 2, obrigatorio: true, periodicidade_meses: 6 },
    { epi_id: "b", quantidade: 1, obrigatorio: false, periodicidade_meses: null },
  ]);
  assert.deepEqual(deBanco(salvo), [
    { epiId: "a", quantidade: 2, obrigatorio: true, periodicidadeMeses: 6 },
    { epiId: "b", quantidade: 1, obrigatorio: false, periodicidadeMeses: "" },
  ]);
});

test("sugestão da entrega: quantidade da matriz, obrigatórios primeiro", () => {
  const epis = [
    { id: "a", nome: "Luva", ca: "1", validade_ca: null },
    { id: "b", nome: "Capacete", ca: "2", validade_ca: "2027-01-01" },
    { id: "c", nome: "Colete", ca: "3", validade_ca: null },
  ];
  const matriz = [
    { epi_id: "a", quantidade: 2, obrigatorio: true },
    { epi_id: "c", quantidade: 1, obrigatorio: false },
    { epi_id: "b", quantidade: 1, obrigatorio: true },
    { epi_id: "x", quantidade: 1, obrigatorio: true }, // EPI que não está mais na lista
  ];
  assert.deepEqual(
    itensSugeridos(matriz, epis).map((item) => `${item.nome}:${item.quantidade}`),
    ["Capacete:1", "Luva:2", "Colete:1"]
  );
  assert.deepEqual(
    itensSugeridos(matriz, epis, { soObrigatorios: true }).map((item) => item.nome),
    ["Capacete", "Luva"]
  );
});

test("texto da periodicidade", () => {
  assert.equal(textoPeriodicidade(null), "—");
  assert.equal(textoPeriodicidade(1), "1 mês");
  assert.equal(textoPeriodicidade(6), "6 meses");
});
