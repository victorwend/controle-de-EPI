// Testes das validações (EPI-322). Rodar com: npm test
// Usa o executor de testes que já vem no Node (node --test),
// sem instalar nenhum pacote.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avaliarSenha,
  cnpjValido,
  formatarCnpj,
  limparCnpj,
  senhaForte,
} from "./validacoes.js";

test("formatarCnpj coloca a máscara conforme a pessoa digita", () => {
  assert.equal(formatarCnpj("11"), "11");
  assert.equal(formatarCnpj("112"), "11.2");
  assert.equal(formatarCnpj("11222333"), "11.222.333");
  assert.equal(formatarCnpj("112223330001"), "11.222.333/0001");
  assert.equal(formatarCnpj("11222333000181"), "11.222.333/0001-81");
});

test("formatarCnpj não passa de 14 caracteres", () => {
  assert.equal(formatarCnpj("1122233300018199999"), "11.222.333/0001-81");
});

test("formatarCnpj aceita colar o CNPJ já pontuado", () => {
  assert.equal(formatarCnpj("11.222.333/0001-81"), "11.222.333/0001-81");
});

test("formatarCnpj aceita letras só nas 12 primeiras posições", () => {
  assert.equal(formatarCnpj("12abc34501de35"), "12.ABC.345/01DE-35");
  // Letra no dígito verificador é descartada.
  assert.equal(formatarCnpj("12ABC34501DEX35"), "12.ABC.345/01DE-35");
});

test("formatarCnpj ignora símbolos e espaços", () => {
  assert.equal(formatarCnpj(" 11 222 333 / 0001 - 81 "), "11.222.333/0001-81");
});

test("limparCnpj tira a máscara", () => {
  assert.equal(limparCnpj("12.abc.345/01de-35"), "12ABC34501DE35");
});

test("cnpjValido aceita CNPJs numéricos corretos", () => {
  assert.equal(cnpjValido("11.222.333/0001-81"), true);
  assert.equal(cnpjValido("11222333000181"), true);
  assert.equal(cnpjValido("33.000.167/0001-01"), true);
});

test("cnpjValido aceita o exemplo de CNPJ alfanumérico da Receita", () => {
  assert.equal(cnpjValido("12.ABC.345/01DE-35"), true);
});

test("cnpjValido recusa dígito verificador errado", () => {
  assert.equal(cnpjValido("11.222.333/0001-82"), false);
  assert.equal(cnpjValido("12.ABC.345/01DE-36"), false);
});

test("cnpjValido recusa tamanho errado e sequências repetidas", () => {
  assert.equal(cnpjValido("11.222.333/0001"), false);
  assert.equal(cnpjValido(""), false);
  assert.equal(cnpjValido("00.000.000/0000-00"), false);
  assert.equal(cnpjValido("11.111.111/1111-11"), false);
});

test("senhaForte exige as 5 regras", () => {
  assert.equal(senhaForte("Epi@2026"), true);
  assert.equal(senhaForte("epi@2026"), false); // sem maiúscula
  assert.equal(senhaForte("EPI@2026"), false); // sem minúscula
  assert.equal(senhaForte("Epi@abcd"), false); // sem número
  assert.equal(senhaForte("Epi12026"), false); // sem caractere especial
  assert.equal(senhaForte("Ep@2026"), false); // só 7 caracteres
});

test("avaliarSenha diz o que falta", () => {
  const faltando = avaliarSenha("abc")
    .filter((regra) => !regra.ok)
    .map((regra) => regra.id);
  assert.deepEqual(faltando, ["tamanho", "maiuscula", "numero", "especial"]);
});
