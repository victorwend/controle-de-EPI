// Conteúdo extraído do protótipo Figma (frames 05.02 — Entrada, 05.07 — Movimentações,
// 05.06 — Vazio). A tabela de 05.07 tem um problema de renderização no próprio Figma
// (linhas sobrepostas, texto ilegível) — só a primeira linha estava legível; as demais
// seguem o mesmo padrão para os outros EPIs já cadastrados, não são dado literal do Figma.

export const LOCAIS_ESTOQUE = ["Almoxarifado Central", "BR-040 — João Pinheiro", "Usina", "Britagem"];

// Saldo por EPI e por local (necessário para a Transferência calcular origem/destino
// separadamente). "Luva de raspa" tem saldo nos dois locais do exemplo do Figma
// (96 na origem, 38 no destino — os números batem com "76"/"58" mostrados após
// transferir 20 unidades, 05.03 — Transferência).
export const SALDO_POR_LOCAL = {
  "Capacete classe B": { "Almoxarifado Central": 96 },
  "Luva de raspa": { "Almoxarifado Central": 96, Usina: 38 },
  "Óculos incolor": { "Almoxarifado Central": 64 },
  "Protetor auricular": { "Almoxarifado Central": 15 },
  "Botina segurança": { "Almoxarifado Central": 52 },
};

export const MOVIMENTACOES_KPIS = {
  noMes: 428,
  entradas: 186,
  saidas: 214,
  ajustes: 28,
};

export const MOVIMENTACOES = [
  { data: "31/08/26", tipo: "Entrada", epi: "Capacete classe B", ca: "12345", qtd: 50, origemDestino: "Fornecedor → Almox. central", responsavel: "Victor", documento: "NF 4587" },
  { data: "27/08/26", tipo: "Entrada", epi: "Luva de raspa", ca: "54321", qtd: 25, origemDestino: "Fornecedor → Almox. central", responsavel: "Victor", documento: "NF 4522" },
  { data: "26/08/26", tipo: "Entrada", epi: "Óculos incolor", ca: "99887", qtd: 18, origemDestino: "Fornecedor → Almox. central", responsavel: "Victor", documento: "NF 4501" },
  { data: "23/08/26", tipo: "Saída", epi: "Protetor auricular", ca: "77661", qtd: 6, origemDestino: "Almox. central → BR-040", responsavel: "Victor", documento: "—" },
  { data: "20/08/26", tipo: "Entrada", epi: "Botina segurança", ca: "66554", qtd: 20, origemDestino: "Fornecedor → Almox. central", responsavel: "Victor", documento: "NF 4487" },
];
