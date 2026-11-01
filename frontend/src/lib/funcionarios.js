// Regras da lista de funcionários e do desligamento (EPI-330).
// Funções puras, testadas em funcionarios.test.js.

// Motivos sugeridos ao inativar. "Outro" deixa escrever o motivo.
export const MOTIVOS_DESLIGAMENTO = [
  "Demissão sem justa causa",
  "Demissão por justa causa",
  "Pedido de demissão",
  "Fim de contrato",
  "Aposentadoria",
  "Outro",
];

function simples(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Filtra a lista da tela. Funcionário INATIVO só aparece com
// mostrarInativos = true (pedido do Victor, 01/11/2026).
export function filtrarFuncionarios(funcionarios, { busca = "", obraId = "", mostrarInativos = false } = {}) {
  const termo = simples(busca.trim());
  return (funcionarios ?? []).filter((funcionario) => {
    if (!mostrarInativos && funcionario.status !== "ativo") return false;
    const bateBusca =
      !termo ||
      simples(funcionario.nome).includes(termo) ||
      simples(funcionario.matricula).includes(termo) ||
      simples(funcionario.funcao).includes(termo);
    const bateObra = !obraId || funcionario.obra_id === obraId;
    return bateBusca && bateObra;
  });
}

export function contarInativos(funcionarios) {
  return (funcionarios ?? []).filter((funcionario) => funcionario.status !== "ativo").length;
}

// Data de hoje no formato do campo <input type="date"> (aaaa-mm-dd),
// no fuso de quem está usando (toISOString usaria o UTC e poderia
// "pular" para o dia seguinte à noite).
export function hojeIso(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Confere o formulário de desligamento. Devolve a mensagem de erro ou "".
// Datas no formato aaaa-mm-dd (dá para comparar como texto).
export function validarDesligamento({ data, motivo, motivoOutro, dataAdmissao, hoje = hojeIso() }) {
  if (!data) return "Informe a data do desligamento.";
  if (data > hoje) return "A data do desligamento não pode ser no futuro.";
  if (dataAdmissao && data < dataAdmissao) return "A data do desligamento não pode ser antes da admissão.";
  if (!motivo) return "Escolha o motivo do desligamento.";
  if (motivo === "Outro" && !String(motivoOutro ?? "").trim()) return "Descreva o motivo do desligamento.";
  return "";
}

export function textoMotivo(motivo, motivoOutro) {
  return motivo === "Outro" ? String(motivoOutro ?? "").trim() : motivo;
}
