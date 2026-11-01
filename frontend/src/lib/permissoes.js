// Perfis de acesso e o que cada um pode fazer (EPI-329).
//
// Modelo "Perfil + obras" (decisão do Victor, 31/10/2026):
//   - o PERFIL diz O QUE a pessoa pode fazer;
//   - as OBRAS liberadas dizem ONDE ela pode fazer (correção 16).
//   - Administrador vale para todas as obras.
//
// IMPORTANTE: quem garante as permissões é o BANCO (policies e funções
// em supabase/). Esta tabela só EXPLICA as regras na tela. Se uma regra
// do banco mudar, atualize a MATRIZ_PERMISSOES junto.

// Perfis que podem ser escolhidos (o Operador saiu: correção 17).
export const PERFIS = [
  { valor: "administrador", label: "Administrador" },
  { valor: "almoxarife", label: "Almoxarife" },
  { valor: "tecnico_seguranca", label: "Técnico de Segurança" },
  { valor: "gestor", label: "Gestor" },
];

// Perfil sugerido ao convidar alguém: o que pode MENOS (só consulta).
export const PERFIL_PADRAO = "gestor";

const ROTULOS = {
  ...Object.fromEntries(PERFIS.map((perfil) => [perfil.valor, perfil.label])),
  operador: "Operador (removido)",
};

export function rotuloPerfil(perfil) {
  return ROTULOS[perfil] ?? "—";
}

export function perfilValido(perfil) {
  return PERFIS.some((opcao) => opcao.valor === perfil);
}

// Cada linha: uma ação do sistema e os perfis que podem fazê-la.
// "regra" aponta onde isso está garantido no banco.
export const MATRIZ_PERMISSOES = [
  {
    acao: "Consultar funcionários, estoque, entregas e relatórios",
    perfis: ["administrador", "almoxarife", "tecnico_seguranca", "gestor"],
    regra: "Só das obras liberadas (correção 16)",
  },
  {
    acao: "Cadastrar e editar EPIs e CAs",
    perfis: ["administrador", "tecnico_seguranca"],
    regra: "correção 09",
  },
  {
    acao: "Locais de estoque, entrada e transferência",
    perfis: ["administrador", "almoxarife"],
    regra: "correções 09 e 16",
  },
  {
    acao: "Entregar EPI, troca e devolução",
    perfis: ["administrador", "almoxarife"],
    regra: "correções 09, 11 e 14",
  },
  {
    acao: "Cadastrar obras e funcionários",
    perfis: ["administrador"],
    regra: "correção 09",
  },
  {
    acao: "Convidar usuários e mudar permissões",
    perfis: ["administrador"],
    regra: "correção 17 e Edge Function convidar-usuario",
  },
  {
    acao: "Ver todas as obras, sem precisar liberar uma a uma",
    perfis: ["administrador"],
    regra: "correção 16",
  },
];

export function podeFazer(perfil, acao) {
  const linha = MATRIZ_PERMISSOES.find((item) => item.acao === acao);
  return Boolean(linha && linha.perfis.includes(perfil));
}

// Texto curto das obras de um usuário, para a lista.
// obrasDoUsuario: nomes das obras liberadas para ele.
export function resumoObras(perfil, obrasDoUsuario) {
  if (perfil === "administrador") return "Todas as obras";
  const nomes = [...(obrasDoUsuario ?? [])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (nomes.length === 0) return "Nenhuma obra (só vê o que é da sede)";
  if (nomes.length <= 2) return nomes.join(", ");
  return `${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}`;
}

// Confere o formulário de permissões ANTES de mandar para o banco.
// Devolve a mensagem de erro, ou "" se estiver tudo certo.
// Ex-operador: para salvar qualquer mudança é preciso escolher um perfil
// novo (o banco não aceita mais "operador" na função de salvar).
export function validarPermissoes({ perfil, ativo, ehVoceMesmo, perfilAtual, ativoAtual }) {
  if (!perfilValido(perfil)) {
    return "Escolha um perfil para este usuário.";
  }
  if (ehVoceMesmo && (perfil !== perfilAtual || ativo !== ativoAtual)) {
    return "Você não pode mudar o seu próprio perfil nem inativar o seu próprio acesso. Peça a outro administrador.";
  }
  return "";
}
