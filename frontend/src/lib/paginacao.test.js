// Testes da paginação (EPI-348). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { faixaMostrada, itensDaPagina, paginasVisiveis, paginaValida, totalPaginas } from "./paginacao.js";

const lista = Array.from({ length: 57 }, (_, i) => i + 1);

test("divide em páginas de 10", () => {
  assert.equal(totalPaginas(57), 6);
  assert.equal(totalPaginas(0), 1);
  assert.equal(totalPaginas(10), 1);
  assert.deepEqual(itensDaPagina(lista, 1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(itensDaPagina(lista, 6), [51, 52, 53, 54, 55, 56, 57]);
});

test("página fora do intervalo volta para uma válida (ex.: depois de filtrar)", () => {
  assert.equal(paginaValida(9, 57), 6);
  assert.equal(paginaValida(0, 57), 1);
  assert.equal(paginaValida(3, 0), 1);
  assert.deepEqual(itensDaPagina(lista.slice(0, 5), 4), [1, 2, 3, 4, 5]);
});

test("índice com reticências quando há muitas páginas", () => {
  assert.deepEqual(paginasVisiveis(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginasVisiveis(1, 20), [1, 2, 3, 4, "…", 20]);
  assert.deepEqual(paginasVisiveis(5, 20), [1, "…", 4, 5, 6, "…", 20]);
  assert.deepEqual(paginasVisiveis(20, 20), [1, "…", 17, 18, 19, 20]);
  assert.deepEqual(paginasVisiveis(3, 10), [1, 2, 3, 4, "…", 10]);
});

test("texto da faixa mostrada", () => {
  assert.equal(faixaMostrada(2, 57), "Mostrando 11–20 de 57");
  assert.equal(faixaMostrada(6, 57), "Mostrando 51–57 de 57");
  assert.equal(faixaMostrada(1, 0), "Nenhum item");
});
