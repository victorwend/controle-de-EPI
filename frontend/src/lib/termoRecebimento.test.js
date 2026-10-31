// Testes do termo de recebimento (EPI-273). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { escaparHtml, montarListaAssinaturasLote, montarTermoIndividual } from "./termoRecebimento.js";

test("escaparHtml neutraliza caracteres especiais", () => {
  assert.equal(escaparHtml('<b>"A" & \'B\'</b>'), "&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;");
  assert.equal(escaparHtml(null), "");
});

test("termo individual traz colaborador, itens, CA e linha de assinatura", () => {
  const html = montarTermoIndividual({
    empresa: "Pavidez",
    funcionario: { nome: "JOAO DA SILVA", matricula: "12206", funcao: "Servente", obra: "obra 1654" },
    local: "Almoxarifado Central",
    itens: [{ nome: "Capacete", ca: "12345", qtd: 1 }, { nome: "Luva", ca: "", qtd: 2 }],
    data: new Date(2026, 9, 31, 14, 30),
  });
  for (const trecho of ["JOAO DA SILVA", "12206", "Capacete", "12345", "Luva", "Assinatura do colaborador", "NR-6", "Almoxarifado Central"]) {
    assert.ok(html.includes(trecho), `faltou: ${trecho}`);
  }
  assert.ok(html.includes("<td>—</td>"), "CA vazio deve aparecer como —");
});

test("termo individual não deixa nome com HTML virar código", () => {
  const html = montarTermoIndividual({ funcionario: { nome: "<script>x()</script>", matricula: "1" }, itens: [] });
  assert.ok(!html.includes("<script>x()"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("lista do lote tem uma linha de assinatura por colaborador", () => {
  const html = montarListaAssinaturasLote({
    local: "Container",
    itens: [{ nome: "Botina", ca: "1", quantidade: 1 }],
    funcionarios: [{ nome: "Ana", matricula: "1" }, { nome: "Bia", matricula: "2" }, { nome: "Caio", matricula: "3" }],
  });
  assert.equal((html.match(/class="linha-assinatura"/g) ?? []).length, 3);
  assert.ok(html.includes("Botina") && html.includes("Caio"));
});

test("rotuloMetodoAceite traduz o método gravado", async () => {
  const { rotuloMetodoAceite } = await import("./termoRecebimento.js");
  assert.equal(rotuloMetodoAceite("confirmacao_responsavel"), "Confirmado pelo responsável");
  assert.equal(rotuloMetodoAceite("assinatura_papel"), "Assinatura em papel");
  assert.equal(rotuloMetodoAceite("simulado"), "Não comprovado (simulado)");
  assert.equal(rotuloMetodoAceite(undefined), "—");
});
