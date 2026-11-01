// Regras da Entrega em lote e da seleção de funcionários (EPI-343).
// Funções puras, testadas em loteEntrega.test.js.
//
// Pedido do Victor (01/11/2026): o lote passa a ser montado escolhendo
// FUNCIONÁRIOS (não mais obra + função), começa com NINGUÉM marcado e os
// EPIs são escolhidos na tela (a matriz da função vira só uma sugestão).

import { motivoValido } from "./entregas.js";
import { itensSugeridos } from "./matriz.js";

// ----- Seleção (Set de ids) ------------------------------------------------

export function alternarId(selecionados, id) {
  const novo = new Set(selecionados);
  if (novo.has(id)) novo.delete(id);
  else novo.add(id);
  return novo;
}

export function todosMarcados(selecionados, visiveis) {
  return (visiveis ?? []).length > 0 && visiveis.every((item) => selecionados.has(item.id));
}

// Marca todos os que estão aparecendo; se todos já estavam, desmarca eles
// (os marcados fora do filtro continuam marcados).
export function alternarTodos(selecionados, visiveis) {
  const marcar = !todosMarcados(selecionados, visiveis);
  const novo = new Set(selecionados);
  for (const item of visiveis ?? []) {
    if (marcar) novo.add(item.id);
    else novo.delete(item.id);
  }
  return novo;
}

// Ids que chegam de outra tela (ex.: Entregas → "Entregar em lote"),
// mantendo só os funcionários que existem e estão ativos.
export function selecaoInicial(ids, funcionariosAtivos) {
  const validos = new Set((funcionariosAtivos ?? []).map((f) => f.id));
  return new Set((ids ?? []).filter((id) => validos.has(id)));
}

// ----- EPIs do lote --------------------------------------------------------
// item: { epiId, nome, ca, validadeCa, quantidade }  (quantidade POR funcionário)

export function adicionarEpi(itens, epi) {
  if (!epi || itens.some((item) => item.epiId === epi.id)) return itens;
  return [...itens, { epiId: epi.id, nome: epi.nome, ca: epi.ca, validadeCa: epi.validade_ca ?? null, quantidade: 1 }];
}

export function mudarQuantidade(itens, epiId, valor) {
  const numero = Math.max(1, Math.floor(Number(valor) || 1));
  return itens.map((item) => (item.epiId === epiId ? { ...item, quantidade: numero } : item));
}

export function removerEpi(itens, epiId) {
  return itens.filter((item) => item.epiId !== epiId);
}

// Sugestão pela matriz: só quando TODOS os selecionados têm a mesma função
// (se as funções forem diferentes, cada uma pede EPIs diferentes).
export function funcaoComum(funcionariosSelecionados) {
  const ids = new Set((funcionariosSelecionados ?? []).map((f) => f.funcao_id ?? null));
  if (ids.size !== 1) return null;
  const [id] = ids;
  return id;
}

export function sugestaoDaMatriz(funcaoId, matriz, epis) {
  if (!funcaoId) return [];
  return itensSugeridos(
    (matriz ?? []).filter((linha) => linha.funcao_id === funcaoId),
    epis,
    { soObrigatorios: true }
  ).map(({ epiId, nome, ca, validadeCa, quantidade }) => ({ epiId, nome, ca, validadeCa, quantidade }));
}

export function faltaSaldo(itens, quantidadePessoas, saldoMap) {
  return (itens ?? [])
    .map((item) => ({
      ...item,
      necessario: item.quantidade * quantidadePessoas,
      disponivel: saldoMap?.[item.epiId] ?? 0,
    }))
    .filter((item) => item.necessario > item.disponivel);
}

// O que ainda falta para o botão "Continuar entrega em lote" funcionar.
// Lista vazia = pode continuar. (Antes o botão ficava apagado sem dizer por quê.)
export function pendenciasLote({ quantidadePessoas, itens, motivo, temLocal, semSaldo }) {
  const faltando = [];
  if (!temLocal) faltando.push("Escolha o local de estoque.");
  if (!quantidadePessoas) faltando.push("Marque pelo menos um funcionário.");
  if (!itens?.length) faltando.push("Adicione pelo menos um EPI.");
  if (!motivoValido(motivo)) faltando.push("Escolha o motivo da entrega.");
  for (const item of semSaldo ?? []) {
    faltando.push(`Saldo insuficiente de ${item.nome}: precisa de ${item.necessario}, tem ${item.disponivel} neste local.`);
  }
  return faltando;
}

export function itensParaRpc(itens) {
  return (itens ?? []).map((item) => ({ epi_id: item.epiId, quantidade: item.quantidade }));
}

// ----- Consulta de entregas (aba Entregas de EPI) --------------------------

// Linhas de entrega_itens do mais recente para o mais antigo e, se houver
// funcionários escolhidos, só as deles.
export function filtrarEntregas(linhas, { busca = "", obraId = "", funcionarioIds = null } = {}) {
  const termo = busca.trim().toLowerCase();
  return (linhas ?? [])
    .filter((linha) => {
      const entrega = linha.entregas ?? {};
      if (funcionarioIds && !funcionarioIds.has(entrega.funcionario_id)) return false;
      const nome = (entrega.funcionarios?.nome ?? "").toLowerCase();
      const epi = (linha.epis?.nome ?? "").toLowerCase();
      if (termo && !nome.includes(termo) && !epi.includes(termo)) return false;
      const obraDaEntrega = entrega.obras?.id ?? entrega.funcionarios?.obras?.id;
      return !obraId || obraDaEntrega === obraId;
    })
    .sort((a, b) => new Date(b.entregas?.created_at ?? 0) - new Date(a.entregas?.created_at ?? 0));
}

// Funcionários (sem repetir) que aparecem nas linhas de entrega visíveis —
// usado pela caixinha "marcar todos" da aba Entregas (EPI-345).
export function funcionariosDasEntregas(linhas) {
  const vistos = new Map();
  for (const linha of linhas ?? []) {
    const id = linha.entregas?.funcionario_id;
    if (id && !vistos.has(id)) vistos.set(id, { id, nome: linha.entregas?.funcionarios?.nome ?? "" });
  }
  return [...vistos.values()];
}

// EPI-347: na aba Entregas, cada caixinha marca só a PRÓPRIA LINHA (antes
// marcava o funcionário e acendia todas as linhas dele). Para "Consultar
// entregas", estes são os funcionários das linhas marcadas, sem repetir.
export function funcionariosDasLinhasMarcadas(linhas, idsMarcados) {
  return funcionariosDasEntregas((linhas ?? []).filter((linha) => idsMarcados.has(linha.id))).map((f) => f.id);
}
