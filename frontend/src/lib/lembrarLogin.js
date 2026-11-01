// "Manter conectado" e "lembrar e-mail" no login (EPI-341).
//
// A SENHA NUNCA É GUARDADA PELO SISTEMA. O que fica no navegador é:
//  - a SESSÃO do Supabase (um "crachá" temporário que ele renova sozinho);
//  - o e-mail, para já vir preenchido.
// Quem guarda a senha, se a pessoa quiser, é o gerenciador de senhas do
// próprio navegador (Chrome/Edge: "Salvar senha?").
//
// Manter conectado = sessão no localStorage (continua depois de fechar o
// navegador). Desmarcado = sessionStorage (some ao fechar o navegador),
// bom para computador compartilhado na obra.

export const CHAVE_MANTER = "epi360.manterConectado";
export const CHAVE_EMAIL = "epi360.emailLembrado";

function seguro(acao, padrao) {
  try {
    return acao();
  } catch {
    // Navegador em modo privado ou armazenamento bloqueado: segue sem lembrar.
    return padrao;
  }
}

// Lê a escolha "manter conectado" (padrão: sim).
export function manterConectado(local = globalThis.localStorage) {
  return seguro(() => local?.getItem(CHAVE_MANTER) !== "nao", true);
}

export function definirManterConectado(manter, local = globalThis.localStorage) {
  seguro(() => local?.setItem(CHAVE_MANTER, manter ? "sim" : "nao"));
}

export function emailLembrado(local = globalThis.localStorage) {
  return seguro(() => local?.getItem(CHAVE_EMAIL) ?? "", "");
}

export function lembrarEmail(email, lembrar, local = globalThis.localStorage) {
  seguro(() => (lembrar && email ? local?.setItem(CHAVE_EMAIL, email) : local?.removeItem(CHAVE_EMAIL)));
}

// "Armazenamento" que o Supabase usa para guardar a sessão. Em cada leitura
// ou gravação ele olha a escolha atual: localStorage (mantém) ou
// sessionStorage (só até fechar o navegador). Ao gravar num, limpa o
// outro, para não sobrar sessão esquecida.
export function criarArmazenamentoSessao(local = globalThis.localStorage, sessao = globalThis.sessionStorage) {
  const escolher = () => (manterConectado(local) ? local : sessao);
  const outro = () => (manterConectado(local) ? sessao : local);
  return {
    getItem: (chave) => seguro(() => escolher()?.getItem(chave) ?? outro()?.getItem(chave) ?? null, null),
    setItem: (chave, valor) =>
      seguro(() => {
        escolher()?.setItem(chave, valor);
        outro()?.removeItem(chave);
      }),
    removeItem: (chave) =>
      seguro(() => {
        local?.removeItem(chave);
        sessao?.removeItem(chave);
      }),
  };
}
