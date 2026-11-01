// Histórico de EPIs do funcionário numa linha do tempo só (EPI-342):
// ENTREGAS (com o motivo), TROCAS, DEVOLUÇÕES e BAIXAS (descarte e
// perda/extravio). Usado na ficha da tela, no Histórico completo, na
// Ficha individual de EPI (impressão) e nas fichas em lote.
// Funções puras, testadas em historicoEpi.test.js.

import { rotuloMotivoEntrega } from "./entregas.js";
import { rotuloMetodoAceite } from "./termoRecebimento.js";

// Campos que as telas buscam no Supabase (para todas pedirem o mesmo).
export const SELECT_ENTREGAS =
  "id, quantidade, epis(nome, ca, validade_ca), entregas!inner(funcionario_id, created_at, motivo, comprovante, aceite_metodo, usuarios(nome_completo), obras(nome))";
export const SELECT_TROCAS =
  "id, funcionario_id, created_at, quantidade, acao, destino, motivo, epis(nome, ca, validade_ca), usuarios(nome_completo), obras(nome)";

// Categoria (para os filtros) e texto de cada troca/devolução.
export function descreverTroca(acao, destino) {
  if (acao === "troca") {
    const fim = { estoque: "usado voltou ao estoque", descarte: "usado descartado", perda: "usado perdido/extraviado" }[destino];
    return { categoria: "troca", tipo: "Troca", detalhe: `Nova unidade entregue; ${fim ?? destino}` };
  }
  if (destino === "estoque") return { categoria: "devolucao", tipo: "Devolução", detalhe: "Voltou ao estoque" };
  if (destino === "descarte") return { categoria: "baixa", tipo: "Baixa", detalhe: "Descartado (sem condição de uso)" };
  if (destino === "perda") return { categoria: "baixa", tipo: "Baixa", detalhe: "Perda / extravio" };
  return { categoria: "devolucao", tipo: "Devolução", detalhe: destino ?? "" };
}

// entregaItens: linhas de entrega_itens (com entregas embutida)
// trocas: linhas de trocas_devolucoes_itens
// Devolve [{ id, data, categoria, tipo, detalhe, epi, ca, validadeCa,
//   quantidade, sinal, obra, responsavel, comprovante, aceite, observacao }]
// do mais recente para o mais antigo.
export function montarHistorico(entregaItens, trocas) {
  const linhas = [];

  for (const item of entregaItens ?? []) {
    linhas.push({
      id: `e-${item.id}`,
      data: item.entregas?.created_at,
      categoria: "entrega",
      tipo: "Entrega",
      detalhe: `Motivo: ${rotuloMotivoEntrega(item.entregas?.motivo)}`,
      epi: item.epis?.nome ?? "—",
      ca: item.epis?.ca ?? "",
      validadeCa: item.epis?.validade_ca ?? null,
      quantidade: item.quantidade,
      sinal: "+",
      obra: item.entregas?.obras?.nome ?? "Sede",
      responsavel: item.entregas?.usuarios?.nome_completo ?? "—",
      comprovante: item.entregas?.comprovante ?? "",
      aceite: rotuloMetodoAceite(item.entregas?.aceite_metodo),
      observacao: "",
    });
  }

  for (const troca of trocas ?? []) {
    const descricao = descreverTroca(troca.acao, troca.destino);
    linhas.push({
      id: `t-${troca.id}`,
      data: troca.created_at,
      ...descricao,
      epi: troca.epis?.nome ?? "—",
      ca: troca.epis?.ca ?? "",
      validadeCa: troca.epis?.validade_ca ?? null,
      quantidade: troca.quantidade,
      // troca: sai o usado e entra um novo (a posse não muda)
      sinal: troca.acao === "troca" ? "±" : "−",
      obra: troca.obras?.nome ?? "Sede",
      responsavel: troca.usuarios?.nome_completo ?? "—",
      comprovante: "",
      aceite: "",
      observacao: troca.motivo ?? "",
    });
  }

  return linhas.sort((a, b) => new Date(b.data) - new Date(a.data));
}

export const FILTROS_HISTORICO = [
  { valor: "", label: "Todos" },
  { valor: "entrega", label: "Entregas" },
  { valor: "troca", label: "Trocas" },
  { valor: "devolucao", label: "Devoluções" },
  { valor: "baixa", label: "Baixas" },
];

export function filtrarHistorico(linhas, categoria) {
  return categoria ? (linhas ?? []).filter((linha) => linha.categoria === categoria) : linhas ?? [];
}

// Junta as trocas por funcionário (para as fichas em lote).
export function agruparTrocasPorFuncionario(trocas) {
  const grupos = {};
  for (const troca of trocas ?? []) (grupos[troca.funcionario_id] ??= []).push(troca);
  return grupos;
}

// Histórico de VÁRIOS funcionários numa lista só (EPI-345: aba Entregas →
// marcar funcionários → "Consultar entregas"). Cada linha leva o
// funcionário; tudo do mais recente para o mais antigo.
export function montarHistoricoDeVarios(funcionarios, itensPorFuncionario = {}, trocasPorFuncionario = {}) {
  const linhas = [];
  for (const funcionario of funcionarios ?? []) {
    for (const linha of montarHistorico(itensPorFuncionario[funcionario.id], trocasPorFuncionario[funcionario.id])) {
      linhas.push({
        ...linha,
        id: `${funcionario.id}-${linha.id}`,
        funcionarioId: funcionario.id,
        funcionarioNome: funcionario.nome,
        funcionarioMatricula: funcionario.matricula,
      });
    }
  }
  return linhas.sort((a, b) => new Date(b.data) - new Date(a.data));
}
