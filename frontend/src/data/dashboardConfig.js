// Conteúdo extraído do protótipo Figma (frame 02.01 — Dashboard). A tabela
// "Movimentações recentes" usa as mesmas 5 entregas de ENTREGAS
// (entregasConfig.js) — os dados batem exatamente com os do Figma.
export const DASHBOARD_KPIS = {
  episEmEstoque: { valor: 1284, nota: "+ 86 neste mês" },
  entregasNoMes: { valor: 347, nota: "37 entregas esta semana" },
  estoqueCritico: { valor: 12, nota: "Itens precisam de reposição" },
  casAVencer: { valor: 8, nota: "Próximos 30 dias" },
};

export const DASHBOARD_ALERTAS = [
  { cor: "laranja", titulo: "12 itens com estoque baixo", descricao: "Revisar reposição de EPIs" },
  { cor: "laranja", titulo: "8 certificados CA a vencer", descricao: "Validade nos próximos 30 dias" },
  { cor: "verde", titulo: "5 entregas sem confirmação", descricao: "Aguardando registro do responsável" },
  { cor: "verde", titulo: "3 funcionários pendentes", descricao: "Sem ficha de EPI atualizada" },
];
