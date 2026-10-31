// Regras da importação de funcionários por planilha (EPI-319).
//
// Este arquivo NÃO conhece Excel nem Supabase: recebe a planilha já lida
// como uma "matriz" (lista de linhas, cada linha uma lista de células) e
// devolve o que fazer com cada linha. Assim dá para testar tudo com
// `npm test`, sem abrir o navegador (ver importacaoFuncionarios.test.js).
//
// Quem lê e gera o arquivo .xlsx é lib/planilha.js.
// Quem grava no banco é a tela pages/funcionarios/ImportarFuncionarios.jsx.

import { cpfValido, formatarCpf } from "./validacoes.js";

export const LIMITE_LINHAS = 2000;

// Colunas da planilha-modelo, na ordem em que aparecem.
export const COLUNAS = [
  { chave: "matricula", titulo: "Matrícula *", obrigatoria: true, exemplo: "00487" },
  { chave: "nome", titulo: "Nome completo *", obrigatoria: true, exemplo: "João Carlos da Silva" },
  { chave: "obra", titulo: "Obra *", obrigatoria: true, exemplo: "(nome da obra, igual à aba Obras)" },
  { chave: "cpf", titulo: "CPF", obrigatoria: false, exemplo: "529.982.247-25" },
  { chave: "funcao", titulo: "Função", obrigatoria: false, exemplo: "Pedreiro" },
  { chave: "setor", titulo: "Setor", obrigatoria: false, exemplo: "Produção" },
  { chave: "dataAdmissao", titulo: "Data de admissão (dd/mm/aaaa)", obrigatoria: false, exemplo: "15/01/2026" },
  { chave: "observacoes", titulo: "Observações", obrigatoria: false, exemplo: "" },
];

// Texto "simplificado" para comparar sem se importar com acentos,
// maiúsculas, espaços extras, asterisco ou o que estiver entre parênteses.
// Ex.: "  Data de Admissão (dd/mm/aaaa) " -> "data de admissao"
export function simplificar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Descobre em qual coluna da planilha está cada campo, pelo título.
// Assim a importação funciona mesmo se a pessoa mudar a ordem das colunas.
export function mapearCabecalho(cabecalho) {
  const posicoes = {};
  (cabecalho ?? []).forEach((titulo, indice) => {
    const coluna = COLUNAS.find((c) => simplificar(c.titulo) === simplificar(titulo));
    if (coluna && posicoes[coluna.chave] === undefined) posicoes[coluna.chave] = indice;
  });

  const faltando = COLUNAS.filter((c) => c.obrigatoria && posicoes[c.chave] === undefined).map(
    (c) => c.titulo.replace(" *", "")
  );

  return { posicoes, faltando };
}

function textoDaCelula(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

// Converte o que veio na célula de data para "aaaa-mm-dd" (formato do banco).
// O Excel pode entregar a data de dois jeitos:
//  - como número (ex.: 46037 = dias contados desde 30/12/1899);
//  - como texto digitado (ex.: "15/01/2026").
// Devolve { valor } ou { erro }.
export function converterData(celula) {
  if (celula === null || celula === undefined || celula === "") return { valor: null };

  let dia;
  let mes;
  let ano;

  if (typeof celula === "number") {
    if (!Number.isFinite(celula) || celula < 1) return { erro: "data de admissão inválida" };
    const data = new Date(Date.UTC(1899, 11, 30) + Math.floor(celula) * 86400000);
    dia = data.getUTCDate();
    mes = data.getUTCMonth() + 1;
    ano = data.getUTCFullYear();
  } else {
    const encontrado = String(celula).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!encontrado) return { erro: "data de admissão deve estar no formato dd/mm/aaaa" };
    dia = Number(encontrado[1]);
    mes = Number(encontrado[2]);
    ano = Number(encontrado[3]);
  }

  // Confere se a data existe de verdade (ex.: 31/02 não existe).
  const conferida = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    conferida.getUTCFullYear() !== ano ||
    conferida.getUTCMonth() !== mes - 1 ||
    conferida.getUTCDate() !== dia
  ) {
    return { erro: "data de admissão não existe no calendário" };
  }
  if (ano < 1950) return { erro: "data de admissão muito antiga" };
  if (conferida.getTime() > Date.now()) return { erro: "data de admissão no futuro" };

  const doisDigitos = (n) => String(n).padStart(2, "0");
  return { valor: `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}` };
}

// Analisa a planilha inteira e separa as linhas em 4 grupos:
//  - novos:          válidos e ainda não cadastrados -> serão gravados
//  - jaCadastrados:  matrícula já existe no sistema  -> ignorados
//  - repetidos:      matrícula aparece de novo na própria planilha -> ignorados
//  - comErro:        faltou dado ou dado inválido     -> não gravados, com o motivo
//
// matriz:               [[cabeçalho...], [linha 2...], [linha 3...], ...]
// obras:                [{ id, nome, codigo }] da empresa
// matriculasExistentes: Set com as matrículas já cadastradas na empresa
//
// "linha" em cada resultado é o número da linha no Excel (o cabeçalho é a 1).
export function analisarPlanilha(matriz, { obras = [], matriculasExistentes = new Set() } = {}) {
  const resultado = { erroGeral: "", novos: [], jaCadastrados: [], repetidos: [], comErro: [] };

  if (!Array.isArray(matriz) || matriz.length === 0) {
    resultado.erroGeral = "A planilha está vazia.";
    return resultado;
  }

  const { posicoes, faltando } = mapearCabecalho(matriz[0]);
  if (faltando.length > 0) {
    resultado.erroGeral = `Não encontrei as colunas obrigatórias: ${faltando.join(", ")}. Use a planilha-modelo sem mudar os títulos da primeira linha.`;
    return resultado;
  }

  const linhasComDados = matriz
    .slice(1)
    .map((celulas, i) => ({ celulas: celulas ?? [], numero: i + 2 }))
    .filter(({ celulas }) => celulas.some((c) => textoDaCelula(c) !== ""));

  if (linhasComDados.length === 0) {
    resultado.erroGeral = "A planilha não tem nenhum funcionário preenchido.";
    return resultado;
  }
  if (linhasComDados.length > LIMITE_LINHAS) {
    resultado.erroGeral = `A planilha tem ${linhasComDados.length} funcionários. O limite por envio é ${LIMITE_LINHAS}; divida em mais de um arquivo.`;
    return resultado;
  }

  // Busca de obra pelo nome OU pelo código, sem ligar para acento/maiúscula.
  const obraPorTexto = new Map();
  for (const obra of obras) {
    if (obra.nome) obraPorTexto.set(simplificar(obra.nome), obra);
    if (obra.codigo) obraPorTexto.set(simplificar(obra.codigo), obra);
  }

  const vistasNaPlanilha = new Map(); // matrícula -> número da 1ª linha onde apareceu

  for (const { celulas, numero } of linhasComDados) {
    const pegar = (chave) => (posicoes[chave] === undefined ? "" : celulas[posicoes[chave]]);

    const matricula = textoDaCelula(pegar("matricula"));
    const nome = textoDaCelula(pegar("nome")).replace(/\s+/g, " ");
    const textoObra = textoDaCelula(pegar("obra"));
    const textoCpf = textoDaCelula(pegar("cpf"));
    const identificacao = { linha: numero, matricula, nome };

    // 1) Já cadastrado ou repetido: ignora (não é erro).
    if (matricula && matriculasExistentes.has(matricula)) {
      resultado.jaCadastrados.push(identificacao);
      continue;
    }
    if (matricula && vistasNaPlanilha.has(matricula)) {
      resultado.repetidos.push({ ...identificacao, primeiraLinha: vistasNaPlanilha.get(matricula) });
      continue;
    }

    // 2) Validações.
    const motivos = [];
    if (!matricula) motivos.push("matrícula em branco");
    else if (matricula.length > 30) motivos.push("matrícula com mais de 30 caracteres");

    if (!nome) motivos.push("nome em branco");
    else if (nome.length > 150) motivos.push("nome com mais de 150 caracteres");

    let obra = null;
    if (!textoObra) motivos.push("obra em branco");
    else {
      obra = obraPorTexto.get(simplificar(textoObra)) ?? null;
      if (!obra) motivos.push(`obra "${textoObra}" não encontrada (veja a aba Obras do modelo)`);
    }

    if (textoCpf && !cpfValido(textoCpf)) motivos.push("CPF inválido");

    const data = converterData(pegar("dataAdmissao"));
    if (data.erro) motivos.push(data.erro);

    if (matricula) vistasNaPlanilha.set(matricula, numero);

    if (motivos.length > 0) {
      resultado.comErro.push({ ...identificacao, motivos });
      continue;
    }

    // 3) Linha boa: monta exatamente o que vai para a tabela funcionarios.
    resultado.novos.push({
      ...identificacao,
      obraNome: obra.nome,
      registro: {
        matricula,
        nome,
        obra_id: obra.id,
        cpf: textoCpf ? formatarCpf(textoCpf) : null,
        funcao: textoDaCelula(pegar("funcao")) || null,
        setor: textoDaCelula(pegar("setor")) || null,
        data_admissao: data.valor,
        observacoes: textoDaCelula(pegar("observacoes")) || null,
      },
    });
  }

  return resultado;
}

// Divide uma lista em pedaços (para gravar no banco em lotes).
export function emLotes(lista, tamanho) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
}
