// Fichas de EPI de VÁRIOS funcionários num documento só (EPI-338).
//
// Mesmo conteúdo da Ficha individual de EPI (FichaEpiIndividual.jsx,
// EPI-328): identificação, uma linha por item entregue (data, obra (EPI-339), EPI, CA,
// validade do CA, quantidade, aceite, responsável, comprovante),
// declaração e assinatura. Cada funcionário começa numa PÁGINA NOVA, então
// "Salvar como PDF" gera um PDF com todas as fichas.
//
// As funções que MONTAM o HTML são puras (testadas em fichaEpi.test.js).

import { escaparHtml, formatarData, rotuloMetodoAceite, TEXTO_DECLARACAO } from "./termoRecebimento.js";

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
  .declaracao { line-height: 1.5; margin: 12px 0 36px; }
  .assinaturas { display: flex; gap: 40px; }
  .assinaturas div { flex: 1; border-top: 1px solid #111; padding-top: 4px; font-size: 11px; color: #333; }
  .rodape { margin-top: 18px; color: #777; font-size: 10px; }
  @media screen { .ficha { border-bottom: 2px dashed #bbb; padding-bottom: 24px; margin-bottom: 24px; } }
  @media print { body { margin: 10mm; } }
`;

function data(dataIso) {
  return dataIso ? new Date(dataIso).toLocaleDateString("pt-BR") : "—";
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

function montarUmaFicha({ empresa, funcionario, itens, geradoEm }) {
  const ultima = itens[0]?.entregas?.created_at;
  const linhas = itens
    .map(
      (item) => `<tr>
        <td>${escaparHtml(data(item.entregas.created_at))}</td>
        <td>${escaparHtml(item.entregas.obras?.nome ?? "Sede")}</td>
        <td>${escaparHtml(item.epis?.nome ?? "—")}</td>
        <td>${escaparHtml(item.epis?.ca || "—")}</td>
        <td>${escaparHtml(formatarData(item.epis?.validade_ca))}</td>
        <td>${escaparHtml(item.quantidade)}</td>
        <td>${escaparHtml(rotuloMetodoAceite(item.entregas.aceite_metodo))}</td>
        <td>${escaparHtml(item.entregas.usuarios?.nome_completo ?? "—")}</td>
        <td>${escaparHtml(item.entregas.comprovante ?? "—")}</td>
      </tr>`
    )
    .join("");

  const tabela =
    itens.length === 0
      ? `<p class="vazio">Nenhuma entrega registrada.</p>`
      : `<table class="itens">
          <thead><tr><th>Data</th><th>Obra</th><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Qtd.</th><th>Aceite</th><th>Responsável</th><th>Comprovante</th></tr></thead>
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
    <p class="rodape">Registros de entrega não podem ser excluídos. Gerado pelo EPI360 em ${escaparHtml(geradoEm)}.</p>
  </section>`;
}

// funcionarios: [{ id, matricula, nome, funcao, setor, status, obras: {nome} }]
// itensPorFuncionario: resultado de agruparItensPorFuncionario
export function montarFichasEpi({ empresa, funcionarios, itensPorFuncionario, geradoEm = new Date().toLocaleString("pt-BR") }) {
  const fichas = (funcionarios ?? [])
    .map((funcionario) =>
      montarUmaFicha({ empresa, funcionario, itens: itensPorFuncionario?.[funcionario.id] ?? [], geradoEm })
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
