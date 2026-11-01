// Testes da Entrega em lote e da consulta de entregas (EPI-343). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adicionarEpi,
  alternarId,
  alternarTodos,
  faltaSaldo,
  filtrarEntregas,
  funcaoComum,
  itensParaRpc,
  mudarQuantidade,
  pendenciasLote,
  removerEpi,
  selecaoInicial,
  sugestaoDaMatriz,
  todosMarcados,
} from "./loteEntrega.js";

const F = [
  { id: "a", nome: "Ana", funcao_id: "pedreiro" },
  { id: "b", nome: "Bruno", funcao_id: "pedreiro" },
  { id: "c", nome: "Caio", funcao_id: "servente" },
];

test("seleção começa vazia e marca um por um", () => {
  let sel = new Set();
  assert.equal(todosMarcados(sel, F), false);
  sel = alternarId(sel, "a");
  assert.deepEqual([...sel], ["a"]);
  sel = alternarId(sel, "a");
  assert.equal(sel.size, 0);
});

test("marcar todos da lista respeita o filtro e não desmarca quem está fora dele", () => {
  let sel = new Set(["c"]);
  const visiveis = F.slice(0, 2);
  sel = alternarTodos(sel, visiveis);
  assert.deepEqual([...sel].sort(), ["a", "b", "c"]);
  assert.equal(todosMarcados(sel, visiveis), true);
  sel = alternarTodos(sel, visiveis);
  assert.deepEqual([...sel], ["c"]);
});

test("seleção vinda de outra tela só mantém funcionários ativos", () => {
  assert.deepEqual([...selecaoInicial(["a", "x"], F)], ["a"]);
  assert.equal(selecaoInicial(undefined, F).size, 0);
});

test("EPIs do lote: adicionar, mudar quantidade, remover", () => {
  let itens = adicionarEpi([], { id: "e1", nome: "Luva", ca: "1", validade_ca: null });
  itens = adicionarEpi(itens, { id: "e1", nome: "Luva" }); // repetido não entra
  assert.equal(itens.length, 1);
  assert.equal(itens[0].quantidade, 1);
  itens = mudarQuantidade(itens, "e1", "3");
  assert.equal(itens[0].quantidade, 3);
  itens = mudarQuantidade(itens, "e1", "0");
  assert.equal(itens[0].quantidade, 1);
  assert.deepEqual(itensParaRpc(itens), [{ epi_id: "e1", quantidade: 1 }]);
  assert.equal(removerEpi(itens, "e1").length, 0);
});

test("sugestão da matriz só quando todos têm a mesma função", () => {
  assert.equal(funcaoComum(F.slice(0, 2)), "pedreiro");
  assert.equal(funcaoComum(F), null);
  const matriz = [
    { funcao_id: "pedreiro", epi_id: "e1", quantidade: 2, obrigatorio: true },
    { funcao_id: "pedreiro", epi_id: "e2", quantidade: 1, obrigatorio: false },
  ];
  const epis = [
    { id: "e1", nome: "Luva", ca: "1" },
    { id: "e2", nome: "Óculos", ca: "2" },
  ];
  assert.deepEqual(sugestaoDaMatriz("pedreiro", matriz, epis), [
    { epiId: "e1", nome: "Luva", ca: "1", validadeCa: undefined, quantidade: 2 },
  ]);
  assert.deepEqual(sugestaoDaMatriz(null, matriz, epis), []);
});

test("o botão Continuar diz o que falta (antes ficava apagado sem explicar)", () => {
  assert.deepEqual(pendenciasLote({ quantidadePessoas: 0, itens: [], motivo: "", temLocal: true, semSaldo: [] }), [
    "Marque pelo menos um funcionário.",
    "Adicione pelo menos um EPI.",
    "Escolha o motivo da entrega.",
  ]);
  const itens = [{ epiId: "e1", nome: "Luva", quantidade: 2 }];
  const semSaldo = faltaSaldo(itens, 3, { e1: 5 });
  assert.equal(semSaldo[0].necessario, 6);
  const faltando = pendenciasLote({ quantidadePessoas: 3, itens, motivo: "admissao", temLocal: true, semSaldo });
  assert.deepEqual(faltando, ["Saldo insuficiente de Luva: precisa de 6, tem 5 neste local."]);
  assert.deepEqual(
    pendenciasLote({ quantidadePessoas: 2, itens, motivo: "troca", temLocal: true, semSaldo: faltaSaldo(itens, 2, { e1: 5 }) }),
    []
  );
});

test("consulta de entregas: só dos funcionários escolhidos, mais recente primeiro", () => {
  const linhas = [
    { id: 1, epis: { nome: "Luva" }, entregas: { funcionario_id: "a", created_at: "2026-10-01", funcionarios: { nome: "Ana" }, obras: { id: "o1" } } },
    { id: 2, epis: { nome: "Bota" }, entregas: { funcionario_id: "b", created_at: "2026-10-03", funcionarios: { nome: "Bruno" }, obras: { id: "o2" } } },
    { id: 3, epis: { nome: "Capacete" }, entregas: { funcionario_id: "a", created_at: "2026-10-05", funcionarios: { nome: "Ana" }, obras: { id: "o2" } } },
  ];
  assert.deepEqual(filtrarEntregas(linhas).map((l) => l.id), [3, 2, 1]);
  assert.deepEqual(filtrarEntregas(linhas, { funcionarioIds: new Set(["a"]) }).map((l) => l.id), [3, 1]);
  assert.deepEqual(filtrarEntregas(linhas, { obraId: "o2" }).map((l) => l.id), [3, 2]);
  assert.deepEqual(filtrarEntregas(linhas, { busca: "bota" }).map((l) => l.id), [2]);
});

test("EPI-345: funcionários das entregas visíveis, sem repetir", async () => {
  const { funcionariosDasEntregas } = await import("./loteEntrega.js");
  const linhas = [
    { entregas: { funcionario_id: "a", funcionarios: { nome: "Ana" } } },
    { entregas: { funcionario_id: "b", funcionarios: { nome: "Bruno" } } },
    { entregas: { funcionario_id: "a", funcionarios: { nome: "Ana" } } },
  ];
  assert.deepEqual(funcionariosDasEntregas(linhas), [
    { id: "a", nome: "Ana" },
    { id: "b", nome: "Bruno" },
  ]);
});
