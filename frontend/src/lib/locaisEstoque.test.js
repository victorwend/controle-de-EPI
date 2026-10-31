// Testes de locaisEstoque.js (EPI-325). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { escolherLocalPadrao } from "./locaisEstoque.js";

test("prefere o Almoxarifado Central, mesmo sem acento/maiúscula igual", () => {
  const locais = [
    { id: "a", nome: "Container obra 1654" },
    { id: "b", nome: "almoxarifado central" },
  ];
  assert.equal(escolherLocalPadrao(locais).id, "b");
});

test("sem Almoxarifado Central, usa o primeiro da lista", () => {
  const locais = [
    { id: "a", nome: "Container obra 1654" },
    { id: "b", nome: "Depósito Sul" },
  ];
  assert.equal(escolherLocalPadrao(locais).id, "a");
});

test("ignora locais inativos", () => {
  const locais = [
    { id: "a", nome: "Almoxarifado Central", status: "inativo" },
    { id: "b", nome: "Depósito Sul", status: "ativo" },
  ];
  assert.equal(escolherLocalPadrao(locais).id, "b");
});

test("sem nenhum local ativo, devolve null", () => {
  assert.equal(escolherLocalPadrao([]), null);
  assert.equal(escolherLocalPadrao([{ id: "a", nome: "X", status: "inativo" }]), null);
  assert.equal(escolherLocalPadrao(undefined), null);
});
