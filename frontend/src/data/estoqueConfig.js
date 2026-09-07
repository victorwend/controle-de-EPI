// Conteúdo extraído do protótipo Figma (frames 05.02 — Entrada, 05.07 — Movimentações,
// 05.06 — Vazio). A tabela de 05.07 tem um problema de renderização no próprio Figma
// (linhas sobrepostas, texto ilegível) — só a primeira linha estava legível; as demais
// seguem o mesmo padrão para os outros EPIs já cadastrados, não são dado literal do Figma.

export const LOCAIS_ESTOQUE = ["Almoxarifado Central", "BR-040 — João Pinheiro", "Usina", "Britagem"];

export const SALDO_POR_EPI = {
  "Capacete classe B": { saldo: 96, local: "Almoxarifado Central" },
  "Luva de raspa": { saldo: 40, local: "Almoxarifado Central" },
  "Óculos incolor": { saldo: 64, local: "Almoxarifado Central" },
  "Protetor auricular": { saldo: 15, local: "Almoxarifado Central" },
  "Botina segurança": { saldo: 52, local: "Almoxarifado Central" },
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
