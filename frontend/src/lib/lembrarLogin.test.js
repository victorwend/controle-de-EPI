// Testes do "manter conectado" e "lembrar e-mail" (EPI-341). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  criarArmazenamentoSessao,
  definirManterConectado,
  emailLembrado,
  lembrarEmail,
  manterConectado,
} from "./lembrarLogin.js";

function armazenamentoFalso() {
  const dados = new Map();
  return {
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
    removeItem: (chave) => dados.delete(chave),
    dados,
  };
}

test("manter conectado começa ligado e pode ser desligado", () => {
  const local = armazenamentoFalso();
  assert.equal(manterConectado(local), true);
  definirManterConectado(false, local);
  assert.equal(manterConectado(local), false);
  definirManterConectado(true, local);
  assert.equal(manterConectado(local), true);
});

test("e-mail lembrado (e esquecido quando desmarca)", () => {
  const local = armazenamentoFalso();
  assert.equal(emailLembrado(local), "");
  lembrarEmail("victor@pavidez.com", true, local);
  assert.equal(emailLembrado(local), "victor@pavidez.com");
  lembrarEmail("victor@pavidez.com", false, local);
  assert.equal(emailLembrado(local), "");
});

test("sessão vai para o localStorage quando mantém conectado", () => {
  const local = armazenamentoFalso();
  const sessao = armazenamentoFalso();
  const armazenamento = criarArmazenamentoSessao(local, sessao);
  armazenamento.setItem("sb-token", "abc");
  assert.equal(local.getItem("sb-token"), "abc");
  assert.equal(sessao.getItem("sb-token"), null);
  assert.equal(armazenamento.getItem("sb-token"), "abc");
});

test("sem manter conectado, a sessão fica só até fechar o navegador", () => {
  const local = armazenamentoFalso();
  const sessao = armazenamentoFalso();
  definirManterConectado(false, local);
  const armazenamento = criarArmazenamentoSessao(local, sessao);
  armazenamento.setItem("sb-token", "abc");
  assert.equal(sessao.getItem("sb-token"), "abc");
  assert.equal(local.getItem("sb-token"), null);
  armazenamento.removeItem("sb-token");
  assert.equal(armazenamento.getItem("sb-token"), null);
});

test("nunca guarda a senha: só a chave da sessão, a escolha e o e-mail", () => {
  const local = armazenamentoFalso();
  lembrarEmail("a@b.com", true, local);
  definirManterConectado(true, local);
  for (const valor of local.dados.values()) assert.equal(/senha|password/i.test(valor), false);
});

test("armazenamento bloqueado não quebra o login", () => {
  const quebrado = {
    getItem() {
      throw new Error("bloqueado");
    },
    setItem() {
      throw new Error("bloqueado");
    },
    removeItem() {
      throw new Error("bloqueado");
    },
  };
  assert.equal(manterConectado(quebrado), true);
  assert.equal(emailLembrado(quebrado), "");
  const armazenamento = criarArmazenamentoSessao(quebrado, quebrado);
  assert.equal(armazenamento.getItem("x"), null);
  assert.doesNotThrow(() => armazenamento.setItem("x", "1"));
});
