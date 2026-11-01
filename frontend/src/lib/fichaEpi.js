// Fichas de EPI de VÁRIOS funcionários num documento só (EPI-338).
//
// Mesmo conteúdo da Ficha individual de EPI (FichaEpiIndividual.jsx,
// EPI-328): identificação, uma linha por movimentação (entrega, troca,
// devolução e baixa — EPI-342) com data, obra (EPI-339), EPI, CA,
// validade do CA, quantidade, aceite, responsável, comprovante),
// declaração e assinatura. Cada funcionário começa numa PÁGINA NOVA, então
// "Salvar como PDF" gera um PDF com todas as fichas.
//
// As funções que MONTAM o HTML são puras (testadas em fichaEpi.test.js).

import { escaparHtml, formatarData, formatarDataHora, TEXTO_DECLARACAO } from "./termoRecebimento.js";
import { montarHistorico } from "./historicoEpi.js";

const ESTILO = `
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; font-size: 12px; }
  .ficha { page-break-after: always; break-after: page; }
  .ficha:last-child { page-break-after: auto; break-after: auto; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: #555; margin: 0 0 12px; }
  .dados { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  .dados td { padding: 2px 8px 2px 0; border: none; }
  table.itens { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
  table.itens th, table.itens td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
  table.itens th { background: #eee; font-size: 11px; }
  .vazio { color: #555; font-style: italic; }
  .det { color: #555; font-size: 10px; }
  .declaracao { line-height: 1.5; margin: 12px 0 36px; }
  .assinaturas { display: flex; gap: 40px; }
  .assinaturas div { flex: 1; border-top: 1px solid #111; padding-top: 4px; font-size: 11px; color: #333; }
  .rodape { margin-top: 18px; color: #777; font-size: 10px; }
  @media screen { .ficha { border-bottom: 2px dashed #bbb; padding-bottom: 24px; margin-bottom: 24px; } }
  @media print { body { margin: 10mm; } }
`;

// EPI-346: data e hora da movimentação.
function data(dataIso) {
  return formatarDataHora(dataIso);
}

// Junta os itens entregues (entrega_itens com entregas embutidas) por
// funcionário, mais recente primeiro.
export function agruparItensPorFuncionario(itens) {
  const grupos = {};
  for (const item of itens ?? []) {
    const id = item.entregas?.funcionario_id;
    if (!id) continue;
    (grupos[id] ??= []).push(item);
  }
  for (const lista of Object.values(grupos)) {
    lista.sort((a, b) => new Date(b.entregas.created_at) - new Date(a.entregas.created_at));
  }
  return grupos;
}

function montarUmaFicha({ empresa, funcionario, itens, trocas, geradoEm }) {
  // EPI-342: entregas + trocas + devoluções + baixas, mais recente primeiro.
  const historico = montarHistorico(itens, trocas);
  const ultima = historico.find((linha) => linha.categoria === "entrega")?.data;
  const linhas = historico
    .map(
      (linha) => `<tr>
        <td>${escaparHtml(data(linha.data))}</td>
        <td><b>${escaparHtml(linha.tipo)}</b><br><span class="det">${escaparHtml(linha.detalhe)}</span></td>
        <td>${escaparHtml(linha.obra)}</td>
        <td>${escaparHtml(linha.epi)}</td>
        <td>${escaparHtml(linha.ca || "—")}</td>
        <td>${escaparHtml(formatarData(linha.validadeCa))}</td>
        <td>${escaparHtml(linha.sinal)}${escaparHtml(linha.quantidade)}</td>
        <td>${escaparHtml(linha.aceite || linha.observacao || "—")}</td>
        <td>${escaparHtml(linha.responsavel)}</td>
        <td>${escaparHtml(linha.comprovante || "—")}</td>
      </tr>`
    )
    .join("");

  const tabela =
    historico.length === 0
      ? `<p class="vazio">Nenhuma entrega registrada.</p>`
      : `<table class="itens">
          <thead><tr><th>Data e hora</th><th>Movimentação</th><th>Obra</th><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Qtd.</th><th>Aceite / observação</th><th>Responsável</th><th>Comprovante</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>`;

  return `<section class="ficha">
    <h1>Ficha individual de EPI</h1>
    <p class="sub">${escaparHtml(empresa || "")}</p>
    <table class="dados">
      <tr><td><b>Colaborador:</b> ${escaparHtml(funcionario.nome)}</td><td><b>Matrícula:</b> ${escaparHtml(funcionario.matricula)}</td></tr>
      <tr><td><b>Função:</b> ${escaparHtml(funcionario.funcao || "—")}</td><td><b>Setor:</b> ${escaparHtml(funcionario.setor || "—")}</td></tr>
      <tr><td><b>Obra:</b> ${escaparHtml(funcionario.obras?.nome ?? "—")}</td><td><b>Status:</b> ${funcionario.status === "ativo" ? "Ativo" : "Inativo"}</td></tr>
      <tr><td><b>Última entrega:</b> ${escaparHtml(data(ultima))}</td><td></td></tr>
    </table>
    ${tabela}
    <p class="declaracao">${escaparHtml(TEXTO_DECLARACAO)}</p>
    <div class="assinaturas"><div>Assinatura do colaborador</div><div>Data</div></div>
    <p class="rodape">Registros de entrega, troca, devolução e baixa não podem ser excluídos. Gerado pelo EPI360 em ${escaparHtml(geradoEm)}.</p>
  </section>`;
}

// funcionarios: [{ id, matricula, nome, funcao, setor, status, obras: {nome} }]
// itensPorFuncionario: resultado de agruparItensPorFuncionario
// trocasPorFuncionario: resultado de agruparTrocasPorFuncionario (EPI-342)
export function montarFichasEpi({
  empresa,
  funcionarios,
  itensPorFuncionario,
  trocasPorFuncionario = {},
  geradoEm = new Date().toLocaleString("pt-BR"),
}) {
  const fichas = (funcionarios ?? [])
    .map((funcionario) =>
      montarUmaFicha({
        empresa,
        funcionario,
        itens: itensPorFuncionario?.[funcionario.id] ?? [],
        trocas: trocasPorFuncionario?.[funcionario.id] ?? [],
        geradoEm,
      })
    )
    .join("");
  const titulo = `Fichas de EPI - ${(funcionarios ?? []).length} colaborador(es)`;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title><style>${ESTILO}</style></head><body>${fichas}</body></html>`;
}

// Divide uma lista em pedaços (para não mandar centenas de IDs numa
// consulta só, o que deixaria o endereço da requisição grande demais).
export function emPedacos(lista, tamanho = 100) {
  const pedacos = [];
  for (let i = 0; i < (lista ?? []).length; i += tamanho) pedacos.push(lista.slice(i, i + tamanho));
  return pedacos;
}
