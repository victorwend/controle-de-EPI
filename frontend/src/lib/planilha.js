// Leitura e geração de arquivos Excel (.xlsx) — EPI-319.
//
// Usa a biblioteca SheetJS ("xlsx"). Atenção: a versão que está no
// registro público do npm (0.18.5) é antiga e tem falhas de segurança
// conhecidas; por isso o pacote foi instalado direto do site oficial
// da SheetJS (cdn.sheetjs.com), como a própria SheetJS recomenda.
//
// Este arquivo só converte "arquivo <-> matriz de células". As regras
// ficam em importacaoFuncionarios.js.

import * as XLSX from "xlsx";
import { COLUNAS } from "./importacaoFuncionarios.js";

export const NOME_ABA_FUNCIONARIOS = "Funcionários";
const LINHAS_FORMATADAS_COMO_TEXTO = 500;
const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024; // 5 MB

// Gera e baixa a planilha-modelo com 3 abas:
//  1) Funcionários — só o cabeçalho, para preencher;
//  2) Obras        — as obras da empresa (o que pode ir na coluna Obra);
//  3) Instruções   — como preencher, com uma linha de exemplo.
export function baixarModeloFuncionarios(obras = []) {
  const livro = XLSX.utils.book_new();

  // Aba 1: Funcionários
  const abaFuncionarios = XLSX.utils.aoa_to_sheet([COLUNAS.map((c) => c.titulo)]);
  abaFuncionarios["!cols"] = COLUNAS.map((c) => ({ wch: Math.max(14, c.titulo.length + 2) }));

  // Matrícula e CPF formatados como TEXTO, para o Excel não apagar
  // zeros à esquerda (00487 virando 487).
  const colunasTexto = ["matricula", "cpf"].map((chave) => COLUNAS.findIndex((c) => c.chave === chave));
  for (let linha = 1; linha <= LINHAS_FORMATADAS_COMO_TEXTO; linha += 1) {
    for (const coluna of colunasTexto) {
      const endereco = XLSX.utils.encode_cell({ r: linha, c: coluna });
      abaFuncionarios[endereco] = { t: "s", v: "", z: "@" };
    }
  }
  abaFuncionarios["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: LINHAS_FORMATADAS_COMO_TEXTO, c: COLUNAS.length - 1 },
  });
  XLSX.utils.book_append_sheet(livro, abaFuncionarios, NOME_ABA_FUNCIONARIOS);

  // Aba 2: Obras
  const linhasObras = [["Nome da obra (copie igual na coluna Obra)", "Código"]];
  for (const obra of obras) linhasObras.push([obra.nome ?? "", obra.codigo ?? ""]);
  const abaObras = XLSX.utils.aoa_to_sheet(linhasObras);
  abaObras["!cols"] = [{ wch: 45 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(livro, abaObras, "Obras");

  // Aba 3: Instruções
  const instrucoes = [
    ["Como preencher"],
    ["1. Preencha a aba Funcionários: uma pessoa por linha, a partir da linha 2."],
    ["2. Não mude os títulos da primeira linha."],
    ["3. Colunas com * são obrigatórias: Matrícula, Nome completo e Obra."],
    ["4. Obra: use o nome (ou o código) exatamente como está na aba Obras."],
    ["5. Data de admissão no formato dd/mm/aaaa (ex.: 15/01/2026)."],
    ["6. Funcionários com matrícula já cadastrada são ignorados (não são duplicados)."],
    ["7. Limite de 2.000 funcionários por arquivo."],
    [],
    ["Exemplo de linha preenchida:"],
    COLUNAS.map((c) => c.titulo),
    COLUNAS.map((c) => c.exemplo),
  ];
  const abaInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
  abaInstrucoes["!cols"] = COLUNAS.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(livro, abaInstrucoes, "Instruções");

  XLSX.writeFile(livro, "modelo-importacao-funcionarios.xlsx");
}

// Lê o arquivo enviado e devolve a aba Funcionários como matriz:
// [[cabeçalho...], [linha 2...], ...]. Datas vêm como número do Excel
// (quem converte é importacaoFuncionarios.converterData).
export async function lerPlanilhaFuncionarios(arquivo) {
  if (!arquivo) throw new Error("Nenhum arquivo selecionado.");
  if (!/\.xlsx$/i.test(arquivo.name)) {
    throw new Error("Envie um arquivo .xlsx (use a planilha-modelo).");
  }
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    throw new Error("Arquivo maior que 5 MB. Divida a planilha em partes menores.");
  }

  const conteudo = await arquivo.arrayBuffer();
  const livro = XLSX.read(conteudo, { type: "array" });

  const nomeAba = livro.SheetNames.includes(NOME_ABA_FUNCIONARIOS)
    ? NOME_ABA_FUNCIONARIOS
    : livro.SheetNames[0];
  const aba = livro.Sheets[nomeAba];
  if (!aba) throw new Error("Não encontrei nenhuma aba na planilha.");

  return XLSX.utils.sheet_to_json(aba, { header: 1, raw: true, defval: "" });
}
