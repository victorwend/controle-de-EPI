// Termo de recebimento de EPI para imprimir e assinar à mão (EPI-273).
//
// Enquanto a biometria não for real, a entrega é concluída pelo botão de
// confirmação do responsável; imprimir este termo é OPCIONAL (para quem
// quiser guardar a assinatura do colaborador em papel). As funções que MONTAM o HTML são puras
// (testadas em termoRecebimento.test.js); só imprimirHtml usa o navegador.
//
// O texto da declaração (TEXTO_DECLARACAO) é o definido pelo Victor em
// 31/10/2026. Vale validar com a Segurança do Trabalho / RH antes do piloto.

// Texto definido pelo Victor em 31/10/2026 ("Regras recomendadas para
// confirmação de entrega de EPI", item 4 — declaração obrigatória de ciência).
export const TEXTO_DECLARACAO =
  "Declaro que recebi os Equipamentos de Proteção Individual relacionados neste documento, " +
  "em perfeitas condições de uso, bem como fui orientado sobre sua utilização, guarda, " +
  "conservação e limitações, comprometendo-me a utilizá-los conforme as normas de segurança da empresa.";

// Evita que um nome com "<", ">" ou "&" quebre o HTML ou injete código.
export function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatarData(data) {
  if (!data) return "Não informada";
  // Datas "aaaa-mm-dd" (sem hora) vêm do banco; evita o fuso deslocar o dia.
  const d = typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(`${data}T00:00:00`) : new Date(data);
  return d.toLocaleDateString("pt-BR");
}

// EPI-346: data E HORA da movimentação ("01/11/2026 09:05"), no fuso do
// computador de quem está vendo. O banco já grava a hora (created_at,
// timestamptz) em toda entrega, troca, devolução e movimentação de estoque.
// Data sem hora ("aaaa-mm-dd", ex.: validade do CA) mostra só a data.
export function formatarDataHora(data) {
  if (!data) return "—";
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) return formatarData(data);
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  const doisDigitos = (n) => String(n).padStart(2, "0");
  return `${d.toLocaleDateString("pt-BR")} ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

const ESTILO = `
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #555; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  .dados td { border: none; padding: 2px 0; }
  .declaracao { line-height: 1.5; margin: 16px 0 40px; }
  .assinatura { margin-top: 48px; width: 60%; border-top: 1px solid #111; padding-top: 4px; }
  .linha-assinatura { height: 36px; }
  .rodape { margin-top: 32px; color: #777; font-size: 11px; }
  @media print { body { margin: 12mm; } }
`;

function pagina(titulo, corpo) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title><style>${ESTILO}</style></head><body>${corpo}</body></html>`;
}

// Termo de UMA entrega (Nova entrega).
// itens: [{ nome, ca, qtd }]
export function montarTermoIndividual({ empresa, funcionario, local, itens, data = new Date(), comprovante, responsavel }) {
  const linhasItens = (itens ?? [])
    .map(
      (item) =>
        `<tr><td>${escaparHtml(item.nome)}</td><td>${escaparHtml(item.ca || "—")}</td><td>${escaparHtml(formatarData(item.validadeCa))}</td><td>${escaparHtml(item.qtd)}</td></tr>`
    )
    .join("");

  const corpo = `
    <h1>Termo de recebimento de EPI</h1>
    <p class="sub">${escaparHtml(empresa || "")}${comprovante ? ` · Comprovante ${escaparHtml(comprovante)}` : ""}</p>
    <table class="dados">
      <tr><td><b>Colaborador:</b> ${escaparHtml(funcionario?.nome)}</td><td><b>Matrícula:</b> ${escaparHtml(funcionario?.matricula)}</td></tr>
      <tr><td><b>Função:</b> ${escaparHtml(funcionario?.funcao || "—")}</td><td><b>Obra:</b> ${escaparHtml(funcionario?.obra || "—")}</td></tr>
      <tr><td><b>Setor:</b> ${escaparHtml(funcionario?.setor || "—")}</td><td></td></tr>
      <tr><td><b>Estoque de origem:</b> ${escaparHtml(local || "—")}</td><td><b>Data:</b> ${escaparHtml(formatarDataHora(data))}</td></tr>
    </table>
    <table>
      <thead><tr><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Quantidade</th></tr></thead>
      <tbody>${linhasItens}</tbody>
    </table>
    <p class="declaracao">${escaparHtml(TEXTO_DECLARACAO)}</p>
    <div class="assinatura">Assinatura do colaborador · Data: ____/____/______</div>
    <div class="assinatura">Responsável pela entrega${responsavel ? `: ${escaparHtml(responsavel)}` : ""}</div>
    <p class="rodape">Documento gerado pelo EPI360. Guarde a via assinada junto à ficha de EPI do colaborador.</p>
  `;
  return pagina(`Termo de recebimento - ${funcionario?.nome ?? ""}`, corpo);
}

// Lista de assinaturas da Entrega em lote: mesmos itens para todos.
// itens: [{ nome, ca, quantidade }]  funcionarios: [{ nome, matricula }]
export function montarListaAssinaturasLote({ empresa, local, itens, funcionarios, data = new Date(), responsavel }) {
  const linhasItens = (itens ?? [])
    .map(
      (item) =>
        `<tr><td>${escaparHtml(item.nome)}</td><td>${escaparHtml(item.ca || "—")}</td><td>${escaparHtml(formatarData(item.validadeCa))}</td><td>${escaparHtml(item.quantidade)}</td></tr>`
    )
    .join("");
  const linhasPessoas = (funcionarios ?? [])
    .map(
      (f, i) =>
        `<tr class="linha-assinatura"><td>${i + 1}</td><td>${escaparHtml(f.nome)}</td><td>${escaparHtml(f.matricula)}</td><td>${escaparHtml(f.funcao || "—")}</td><td></td></tr>`
    )
    .join("");

  const corpo = `
    <h1>Lista de assinaturas — entrega de EPI em lote</h1>
    <p class="sub">${escaparHtml(empresa || "")} · Estoque de origem: ${escaparHtml(local || "—")} · ${escaparHtml(formatarDataHora(data))}</p>
    <p><b>Itens entregues a cada colaborador:</b></p>
    <table>
      <thead><tr><th>EPI</th><th>CA</th><th>Validade do CA</th><th>Quantidade por pessoa</th></tr></thead>
      <tbody>${linhasItens}</tbody>
    </table>
    <p class="declaracao">${escaparHtml(TEXTO_DECLARACAO)}</p>
    <table>
      <thead><tr><th>#</th><th>Colaborador</th><th>Matrícula</th><th>Função</th><th style="width:35%">Assinatura</th></tr></thead>
      <tbody>${linhasPessoas}</tbody>
    </table>
    <div class="assinatura">Responsável pela entrega${responsavel ? `: ${escaparHtml(responsavel)}` : ""}</div>
    <p class="rodape">Documento gerado pelo EPI360. Só confirme no sistema a entrega de quem assinou esta lista.</p>
  `;
  return pagina("Lista de assinaturas - entrega em lote", corpo);
}

// Abre o termo numa janela nova e chama a impressão do navegador.
export function imprimirHtml(html) {
  const janela = window.open("", "_blank", "width=900,height=700");
  if (!janela) {
    throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups para este site e tente de novo.");
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  janela.focus();
  // Pequena espera para o navegador montar a página antes de imprimir.
  setTimeout(() => janela.print(), 300);
}

// Texto amigável do método de aceite gravado na entrega (entregas.aceite_metodo).
const ROTULOS_ACEITE = {
  confirmacao_responsavel: "Confirmado pelo responsável",
  assinatura_papel: "Assinatura em papel",
  assinatura_tela: "Assinatura na tela",
  biometria: "Biometria",
  simulado: "Não comprovado (simulado)",
};

export function rotuloMetodoAceite(metodo) {
  return ROTULOS_ACEITE[metodo] ?? "—";
}
