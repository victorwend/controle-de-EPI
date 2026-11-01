// Testes do motivo da entrega e da baixa no desligamento (EPI-340). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  baixaInicial,
  baixaParaSalvar,
  MOTIVOS_ENTREGA,
  motivoSugerido,
  motivoValido,
  rotuloDestino,
  rotuloMotivoEntrega,
  validarBaixa,
} from "./entregas.js";

test("motivos da entrega iguais aos do banco", () => {
  assert.deepEqual(
    MOTIVOS_ENTREGA.map((item) => item.valor),
    ["admissao", "troca", "desgaste", "perda"]
  );
  assert.equal(rotuloMotivoEntrega("desgaste"), "Desgaste natural");
  assert.equal(rotuloMotivoEntrega(null), "Não informado");
  assert.equal(motivoValido("perda"), true);
  assert.equal(motivoValido(""), false);
});

test("sugestão: quem nunca recebeu é admissão; os outros escolhem", () => {
  assert.equal(motivoSugerido(false), "admissao");
  assert.equal(motivoSugerido(true), "");
});

test("baixa do desligamento: uma linha por EPI em posse", () => {
  const baixa = baixaInicial([
    { epi_id: "a", quantidade: 1, epis: { nome: "Capacete", ca: "1" } },
    { epi_id: "b", quantidade: 0, epis: { nome: "Zerado" } },
    { epi_id: "c", quantidade: 2, epis: { nome: "Luva" } },
  ]);
  assert.deepEqual(
    baixa.map((item) => `${item.nome}:${item.quantidade}`),
    ["Capacete:1", "Luva:2"]
  );
  assert.match(validarBaixa(baixa, "local"), /destino de "Capacete"/);

  baixa[0].destino = "estoque";
  baixa[1].destino = "perda";
  assert.match(validarBaixa(baixa, ""), /local de estoque/);
  assert.equal(validarBaixa(baixa, "local"), "");
  // sem nada indo para o estoque, o local não é obrigatório
  baixa[0].destino = "descarte";
  assert.equal(validarBaixa(baixa, ""), "");

  assert.deepEqual(baixaParaSalvar(baixa), [
    { epi_id: "a", quantidade: 1, destino: "descarte" },
    { epi_id: "c", quantidade: 2, destino: "perda" },
  ]);
  assert.equal(rotuloDestino("perda"), "Perda / extravio (não devolvido)");
});
