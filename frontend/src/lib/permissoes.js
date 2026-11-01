// Perfis de acesso e o que cada um pode fazer (EPI-329).
//
// Modelo "Perfil + obras" (decisão do Victor, 31/10/2026):
//   - o PERFIL diz O QUE a pessoa pode fazer;
//   - as OBRAS liberadas dizem ONDE ela pode fazer (correção 16).
//   - Administrador vale para todas as obras.
//
// EPI-331: o Administrador escolhe com caixinhas o que cada perfil pode
// fazer (tabela permissoes_perfil, correção 19). Quem garante é o BANCO;
// aqui só se desenha a tela e se escondem botões.

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

// Perfis cujas permissões o Administrador configura (EPI-331).
// O próprio Administrador pode tudo e não é configurável.
export const PERFIS_CONFIGURAVEIS = ["almoxarife", "tecnico_seguranca", "gestor"];

// Cada linha da tabela "O que cada perfil pode fazer".
//  - chave: nome da ação no banco (tabela permissoes_perfil). Linha com
//    chave tem caixinhas que o Administrador marca/desmarca.
//  - fixa: linha SEM caixinha (regra fixa por segurança); "perfis" diz
//    quem pode.
//  - padrao: quem já vinha marcado (igual ao banco: correção 19).
// Quem GARANTE as regras é o banco; esta lista só desenha a tela.
export const MATRIZ_PERMISSOES = [
  {
    acao: "Consultar funcionários, estoque, entregas e relatórios",
    detalhe: "Fixo: todos consultam as obras liberadas para eles",
    fixa: true,
    perfis: ["administrador", "almoxarife", "tecnico_seguranca", "gestor"],
  },
  {
    chave: "gerenciar_epis",
    acao: "Cadastrar e editar EPIs e CAs",
    detalhe: "Catálogo de EPIs da empresa",
    padrao: ["tecnico_seguranca"],
  },
  {
    chave: "gerenciar_estoque",
    acao: "Locais de estoque, entrada e transferência",
    detalhe: "Só nas obras liberadas",
    padrao: ["almoxarife"],
  },
  {
    chave: "registrar_entregas",
    acao: "Entregar EPI, troca e devolução",
    detalhe: "Só nas obras liberadas",
    padrao: ["almoxarife"],
  },
  {
    chave: "gerenciar_funcionarios",
    acao: "Cadastrar, editar, importar e inativar funcionários",
    detalhe: "Só nas obras liberadas",
    padrao: [],
  },
  {
    chave: "gerenciar_obras",
    acao: "Cadastrar e editar obras",
    detalhe: 'Exige "Ver todas as obras"',
    padrao: [],
    exige: "ver_todas_obras",
  },
  {
    chave: "ver_todas_obras",
    acao: "Ver todas as obras, sem precisar liberar uma a uma",
    detalhe: "Ignora as obras liberadas do usuário",
    padrao: [],
  },
  {
    acao: "Convidar usuários e mudar permissões",
    detalhe: "Fixo: só o Administrador",
    fixa: true,
    perfis: ["administrador"],
  },
];

export const ACOES_CONFIGURAVEIS = MATRIZ_PERMISSOES.filter((linha) => linha.chave).map((linha) => linha.chave);

// Estado das caixinhas: { almoxarife: ["gerenciar_estoque", ...], ... }
export function permissoesPadrao() {
  return Object.fromEntries(
    PERFIS_CONFIGURAVEIS.map((perfil) => [
      perfil,
      MATRIZ_PERMISSOES.filter((linha) => linha.chave && linha.padrao.includes(perfil)).map((linha) => linha.chave),
    ])
  );
}

// Converte as linhas da tabela permissoes_perfil no estado das caixinhas.
export function montarEstado(linhas) {
  const estado = Object.fromEntries(PERFIS_CONFIGURAVEIS.map((perfil) => [perfil, []]));
  for (const linha of linhas ?? []) {
    if (estado[linha.perfil] && !estado[linha.perfil].includes(linha.acao)) estado[linha.perfil].push(linha.acao);
  }
  return estado;
}

// Marca/desmarca uma caixinha respeitando as dependências:
// marcar "obras" marca "ver todas"; desmarcar "ver todas" desmarca "obras".
export function marcarAcao(estado, perfil, chave, marcado) {
  let acoes = new Set(estado[perfil] ?? []);
  if (marcado) acoes.add(chave);
  else acoes.delete(chave);

  for (const linha of MATRIZ_PERMISSOES) {
    if (!linha.exige) continue;
    if (marcado && chave === linha.chave) acoes.add(linha.exige);
    if (!marcado && chave === linha.exige) acoes.delete(linha.chave);
  }
  acoes = ACOES_CONFIGURAVEIS.filter((acao) => acoes.has(acao));
  return { ...estado, [perfil]: acoes };
}

// O usuário logado pode fazer esta ação? (para esconder botões na tela)
// minhasAcoes: ações do perfil dele, lidas de permissoes_perfil.
export function podeFazer(perfil, chave, minhasAcoes) {
  if (perfil === "administrador") return true;
  return (minhasAcoes ?? []).includes(chave);
}

// Perfis que mudaram em relação ao que está salvo (para salvar só eles).
export function perfisAlterados(salvo, atual) {
  return PERFIS_CONFIGURAVEIS.filter((perfil) => {
    const a = [...(salvo[perfil] ?? [])].sort().join(",");
    const b = [...(atual[perfil] ?? [])].sort().join(",");
    return a !== b;
  });
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
