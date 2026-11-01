// Testes das fichas de EPI em lote (EPI-338). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparItensPorFuncionario, emPedacos, montarFichasEpi } from "./fichaEpi.js";

const ITENS = [
  {
    quantidade: 1,
    epis: { nome: "Capacete", ca: "123", validade_ca: "2027-05-10" },
    entregas: { funcionario_id: "f1", created_at: "2026-10-01T10:00:00Z", comprovante: "C-1", aceite_metodo: "confirmacao_responsavel", usuarios: { nome_completo: "Victor" }, obras: { nome: "Obra antiga" } },
  },
  {
    quantidade: 2,
    epis: { nome: "Luva", ca: "456", validade_ca: null },
    entregas: { funcionario_id: "f1", created_at: "2026-10-20T10:00:00Z", comprovante: "C-2", aceite_metodo: "confirmacao_responsavel", usuarios: null },
  },
  {
    quantidade: 1,
    epis: { nome: "Botina", ca: "789", validade_ca: null },
    entregas: { funcionario_id: "f2", created_at: "2026-10-05T10:00:00Z", comprovante: "C-3", aceite_metodo: "simulado" },
  },
];

const FUNCIONARIOS = [
  { id: "f1", matricula: "100", nome: "João <Silva>", funcao: "Servente", setor: null, status: "ativo", obras: { nome: "Obra 1654" } },
  { id: "f2", matricula: "200", nome: "Maria", funcao: null, setor: "Civil", status: "inativo", obras: null },
  { id: "f3", matricula: "300", nome: "Sem entregas", status: "ativo" },
];

test("agrupa itens por funcionário, mais recente primeiro", () => {
  const grupos = agruparItensPorFuncionario(ITENS);
  assert.deepEqual(Object.keys(grupos).sort(), ["f1", "f2"]);
  assert.deepEqual(grupos.f1.map((item) => item.epis.nome), ["Luva", "Capacete"]);
});

test("um documento com uma ficha (página) por funcionário", () => {
  const html = montarFichasEpi({
    empresa: "Pavidez",
    funcionarios: FUNCIONARIOS,
    itensPorFuncionario: agruparItensPorFuncionario(ITENS),
    geradoEm: "01/11/2026",
  });
  assert.equal((html.match(/<section class="ficha">/g) ?? []).length, 3);
  assert.match(html, /page-break-after: always/);
  assert.match(html, /Fichas de EPI - 3 colaborador\(es\)/);
  // nome com < > não vira HTML
  assert.match(html, /João &lt;Silva&gt;/);
  assert.match(html, /Capacete/);
  // EPI-339: cada linha mostra a obra em que o EPI foi entregue
  assert.match(html, /<th>Obra<\/th>/);
  assert.match(html, /Obra antiga/);
  assert.match(html, /Sede/);
  assert.match(html, /Confirmado pelo responsável/);
  assert.match(html, /Nenhuma entrega registrada/); // f3
  assert.match(html, /Inativo/); // f2
  assert.match(html, /Assinatura do colaborador/);
});

test("divide a lista em pedaços", () => {
  assert.deepEqual(emPedacos([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(emPedacos([], 2), []);
});
