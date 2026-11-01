// Regras da Matriz EPI x Função (EPI-280). Funções puras, testadas em
// matriz.test.js. Quem GARANTE as regras é o banco (correção 21); aqui a
// tela confere antes de enviar, para mostrar a mensagem na hora.

// Mesmo jeito do banco: sem espaços nas pontas nem espaços repetidos.
export function normalizarNomeFuncao(nome) {
  return String(nome ?? "").trim().replace(/\s+/g, " ");
}

// Já existe uma função com esse nome (sem diferenciar maiúscula)?
// ignorarId: ao renomear, a própria função não conta.
export function funcaoJaExiste(funcoes, nome, ignorarId = null) {
  const alvo = normalizarNomeFuncao(nome).toLocaleLowerCase("pt-BR");
  return (funcoes ?? []).some(
    (funcao) => funcao.id !== ignorarId && normalizarNomeFuncao(funcao.nome).toLocaleLowerCase("pt-BR") === alvo
  );
}

export function validarNomeFuncao(funcoes, nome, ignorarId = null) {
  if (!normalizarNomeFuncao(nome)) return "Digite o nome da função.";
  if (funcaoJaExiste(funcoes, nome, ignorarId)) return "Já existe uma função com esse nome.";
  return "";
}

function inteiroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
}

// itens: [{ epiId, quantidade, obrigatorio, periodicidadeMeses }]
// Devolve a mensagem de erro, ou "" se estiver tudo certo.
export function validarItensMatriz(itens) {
  const vistos = new Set();
  for (const [indice, item] of (itens ?? []).entries()) {
    const linha = `Linha ${indice + 1}`;
    if (!item.epiId) return `${linha}: escolha o EPI.`;
    if (vistos.has(item.epiId)) return `${linha}: este EPI já está na matriz.`;
    vistos.add(item.epiId);
    if (!inteiroPositivo(item.quantidade)) return `${linha}: a quantidade deve ser um número inteiro maior que zero.`;
    const periodicidade = item.periodicidadeMeses;
    if (periodicidade !== "" && periodicidade != null && !inteiroPositivo(periodicidade)) {
      return `${linha}: a troca deve ser em meses (número inteiro) ou ficar em branco.`;
    }
  }
  return "";
}

// Formato que a função salvar_matriz_funcao do banco espera.
export function paraSalvar(itens) {
  return (itens ?? []).map((item) => ({
    epi_id: item.epiId,
    quantidade: Number(item.quantidade),
    obrigatorio: Boolean(item.obrigatorio),
    periodicidade_meses: item.periodicidadeMeses === "" || item.periodicidadeMeses == null ? null : Number(item.periodicidadeMeses),
  }));
}

// Linhas do banco (matriz_epi_funcao) -> itens do formulário.
export function deBanco(linhas) {
  return (linhas ?? []).map((linha) => ({
    epiId: linha.epi_id,
    quantidade: linha.quantidade,
    obrigatorio: linha.obrigatorio,
    periodicidadeMeses: linha.periodicidade_meses ?? "",
  }));
}

// EPIs sugeridos na entrega a partir da matriz da função.
// soObrigatorios: a entrega em lote sugere só os obrigatórios.
// Obrigatórios primeiro, depois por nome.
export function itensSugeridos(linhasMatriz, epis, { soObrigatorios = false } = {}) {
  const porId = Object.fromEntries((epis ?? []).map((epi) => [epi.id, epi]));
  return (linhasMatriz ?? [])
    .filter((linha) => !soObrigatorios || linha.obrigatorio)
    .map((linha) => {
      const epi = porId[linha.epi_id];
      if (!epi) return null;
      return {
        epiId: epi.id,
        nome: epi.nome,
        ca: epi.ca,
        validadeCa: epi.validade_ca,
        quantidade: linha.quantidade,
        obrigatorio: linha.obrigatorio,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.obrigatorio) - Number(a.obrigatorio) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function textoPeriodicidade(meses) {
  if (!meses) return "—";
  return Number(meses) === 1 ? "1 mês" : `${meses} meses`;
}
