// Conteúdo extraído do protótipo Figma (frames 07.01 — Obras — Lista e
// 07.02 — Obras — Detalhes da obra). Só a obra "br-040" tem detalhe desenhado
// no Figma; as demais usam os mesmos números da lista com um aviso honesto de
// que o detalhamento operacional completo ainda não foi desenhado.

export const OBRAS_RESUMO = [
  {
    slug: "br-040",
    nome: "BR-040 — João Pinheiro",
    funcionarios: 128,
    episEstoque: 432,
    pendencia: "4 pendências",
  },
  {
    slug: "usina",
    nome: "Usina",
    funcionarios: 76,
    episEstoque: 318,
    pendencia: "2 pendências",
  },
  {
    slug: "britagem",
    nome: "Britagem",
    funcionarios: 54,
    episEstoque: 221,
    pendencia: "1 pendência",
  },
  {
    slug: "almoxarifado-central",
    nome: "Almoxarifado Central",
    funcionarios: null,
    episEstoque: 313,
    pendencia: "5 itens críticos",
  },
];

export const OBRA_DETALHE = {
  "br-040": {
    nome: "BR-040 — João Pinheiro",
    subtitle: "Visão operacional da obra, colaboradores, estoque e pendências de EPI.",
    cards: [
      {
        title: "Dados da obra",
        lines: ["128 funcionários ativos", "432 EPIs em estoque local"],
        highlight: "4 pendências de conformidade",
        linkLabel: "Ver funcionários",
        to: "/funcionarios",
      },
      {
        title: "Estoque da obra",
        lines: ["12 itens cadastrados", "432 unidades disponíveis"],
        highlight: "3 itens críticos",
        linkLabel: "Ver estoque",
        to: "/estoque",
      },
      {
        title: "Conformidade",
        lines: ["121 funcionários conformes", "7 com pendências"],
        highlight: "8 CAs próximos do vencimento",
        linkLabel: "Ver pendências",
        to: "/relatorios",
      },
      {
        title: "Responsáveis",
        lines: ["Victor • Administrador", "SST • Almoxarifado • RH"],
        highlight: "Última atualização: 31/08/2026",
        linkLabel: "Ver responsáveis",
        to: "/configuracoes",
      },
    ],
    acoes: "Consultar funcionários • Transferir estoque • Gerar ficha • Ver pendências",
    acoesNota: "Movimentações e histórico permanecem vinculados à obra para auditoria.",
  },
};
