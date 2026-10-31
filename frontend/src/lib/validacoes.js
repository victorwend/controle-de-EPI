// Validações reutilizáveis de formulário (EPI-322).
// Funções puras, sem React: podem ser testadas com `npm test`
// (ver validacoes.test.js) e usadas em qualquer tela.

// ---------------------------------------------------------------------
// CNPJ
// ---------------------------------------------------------------------
// Desde julho de 2026 a Receita Federal também emite CNPJ ALFANUMÉRICO
// (IN RFB nº 2.229/2024): as 12 primeiras posições podem ter letras
// maiúsculas (A–Z) ou números, e as 2 últimas (dígitos verificadores)
// continuam sendo só números. Os CNPJs antigos, só com números, seguem
// válidos e passam pela mesma regra.
// Formato com máscara: XX.XXX.XXX/XXXX-XX (18 caracteres).

const TAMANHO_CNPJ = 14;

// Remove a pontuação e deixa só letras (maiúsculas) e números.
export function limparCnpj(valor) {
  return String(valor ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

// Recebe o que a pessoa digitou e devolve o texto já com a máscara.
// - corta em 14 caracteres;
// - nas 2 últimas posições só aceita número (letra ali é descartada).
export function formatarCnpj(valor) {
  const limpo = limparCnpj(valor);
  let resultado = "";

  for (const caractere of limpo) {
    if (resultado.length >= TAMANHO_CNPJ) break;
    const posicao = resultado.length; // 0 a 13
    const ehDigitoVerificador = posicao >= 12;
    if (ehDigitoVerificador && !/[0-9]/.test(caractere)) continue;
    resultado += caractere;
  }

  // Coloca . / e - nas posições certas, conforme a pessoa digita.
  let mascarado = resultado.slice(0, 2);
  if (resultado.length > 2) mascarado += "." + resultado.slice(2, 5);
  if (resultado.length > 5) mascarado += "." + resultado.slice(5, 8);
  if (resultado.length > 8) mascarado += "/" + resultado.slice(8, 12);
  if (resultado.length > 12) mascarado += "-" + resultado.slice(12, 14);
  return mascarado;
}

// Valor de cada caractere no cálculo do dígito verificador:
// código ASCII menos 48. Para números dá 0–9 (igual ao cálculo antigo);
// para letras, A = 17, B = 18, ... Z = 42.
function valorDoCaractere(caractere) {
  return caractere.charCodeAt(0) - 48;
}

// Calcula um dígito verificador pelo módulo 11.
// Pesos: começam em 2 da direita para a esquerda e voltam a 2 depois do 9.
function calcularDigito(base) {
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i -= 1) {
    soma += valorDoCaractere(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// true se o CNPJ (com ou sem máscara) é válido.
export function cnpjValido(valor) {
  const cnpj = limparCnpj(valor);

  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;

  // Sequências repetidas (00000000000000, 11111111111111...) passam no
  // cálculo, mas não são CNPJs reais.
  if (/^(.)\1+$/.test(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const digito1 = calcularDigito(base);
  const digito2 = calcularDigito(base + digito1);

  return cnpj.endsWith(`${digito1}${digito2}`);
}

// ---------------------------------------------------------------------
// Senha forte
// ---------------------------------------------------------------------
// A mesma regra precisa estar ligada no Supabase Auth
// (Authentication > ... > Password requirements), porque a validação
// da tela pode ser contornada por quem chama a API direto.

export const TAMANHO_MINIMO_SENHA = 8;

export const REGRAS_SENHA = [
  {
    id: "tamanho",
    texto: `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`,
    teste: (senha) => senha.length >= TAMANHO_MINIMO_SENHA,
  },
  { id: "minuscula", texto: "Uma letra minúscula", teste: (senha) => /[a-z]/.test(senha) },
  { id: "maiuscula", texto: "Uma letra maiúscula", teste: (senha) => /[A-Z]/.test(senha) },
  { id: "numero", texto: "Um número", teste: (senha) => /[0-9]/.test(senha) },
  {
    id: "especial",
    texto: "Um caractere especial (ex.: ! @ # $ %)",
    teste: (senha) => /[^A-Za-z0-9]/.test(senha),
  },
];

// Devolve cada regra com `ok: true/false`, para a tela mostrar a lista.
export function avaliarSenha(senha) {
  const texto = String(senha ?? "");
  return REGRAS_SENHA.map((regra) => ({ id: regra.id, texto: regra.texto, ok: regra.teste(texto) }));
}

export function senhaForte(senha) {
  return avaliarSenha(senha).every((regra) => regra.ok);
}

// ---------------------------------------------------------------------
// CPF (EPI-319: usado na importação de funcionários)
// ---------------------------------------------------------------------

export function limparCpf(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

export function formatarCpf(valor) {
  const cpf = limparCpf(valor).slice(0, 11);
  let resultado = cpf.slice(0, 3);
  if (cpf.length > 3) resultado += "." + cpf.slice(3, 6);
  if (cpf.length > 6) resultado += "." + cpf.slice(6, 9);
  if (cpf.length > 9) resultado += "-" + cpf.slice(9, 11);
  return resultado;
}

// Dígitos verificadores do CPF: módulo 11, com pesos 10..2 (1º dígito)
// e 11..2 (2º dígito).
export function cpfValido(valor) {
  const cpf = limparCpf(valor);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const digito = (base, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += Number(base[i]) * (pesoInicial - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = digito(cpf.slice(0, 9), 10);
  const d2 = digito(cpf.slice(0, 9) + d1, 11);
  return cpf.endsWith(`${d1}${d2}`);
}
