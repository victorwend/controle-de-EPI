// Paginação de listas na tela (EPI-348). Funções puras, testadas em paginacao.test.js.
//
// Pedido do Victor (01/11/2026): na aba Entregas de EPI, limitar as linhas
// para caberem no layout e mostrar o resto em páginas "1 2 3 … 10".

export const ITENS_POR_PAGINA = 10;

export function totalPaginas(quantidade, porPagina = ITENS_POR_PAGINA) {
  return Math.max(1, Math.ceil((quantidade ?? 0) / porPagina));
}

// Página válida (entre 1 e o total): se um filtro diminuir a lista, a tela
// não fica numa página que não existe mais.
export function paginaValida(pagina, quantidade, porPagina = ITENS_POR_PAGINA) {
  const total = totalPaginas(quantidade, porPagina);
  return Math.min(Math.max(1, Math.floor(Number(pagina) || 1)), total);
}

export function itensDaPagina(lista, pagina, porPagina = ITENS_POR_PAGINA) {
  const atual = paginaValida(pagina, lista?.length ?? 0, porPagina);
  const inicio = (atual - 1) * porPagina;
  return (lista ?? []).slice(inicio, inicio + porPagina);
}

// Números que aparecem no índice. Até 7 páginas: todas. Mais que isso:
// primeira, última, a atual com uma de cada lado e "…" nos buracos.
// Ex.: atual 5 de 20 -> [1, "…", 4, 5, 6, "…", 20]
export function paginasVisiveis(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const numeros = new Set([1, total, atual - 1, atual, atual + 1]);
  if (atual <= 3) [2, 3, 4].forEach((n) => numeros.add(n));
  if (atual >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => numeros.add(n));
  const ordenados = [...numeros].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultado = [];
  ordenados.forEach((n, i) => {
    if (i > 0 && n - ordenados[i - 1] > 1) resultado.push("…");
    resultado.push(n);
  });
  return resultado;
}

// "Mostrando 11–20 de 57"
export function faixaMostrada(pagina, quantidade, porPagina = ITENS_POR_PAGINA) {
  if (!quantidade) return "Nenhum item";
  const atual = paginaValida(pagina, quantidade, porPagina);
  const inicio = (atual - 1) * porPagina + 1;
  const fim = Math.min(atual * porPagina, quantidade);
  return `Mostrando ${inicio}–${fim} de ${quantidade}`;
}
