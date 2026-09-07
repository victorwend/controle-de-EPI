// Campos extraídos tela a tela do protótipo Figma (frames 09.03, 09.04, 09.05, 09.08, 09.09).
// Campos do tipo "select" que dependem de outro cadastro ainda não construído (Obra,
// Responsável, Setor) ficam sem opções reais por enquanto — ver docs/05-arquitetura/
// plano-de-producao-telas.md para a ordem de construção dos cadastros mestres.

export const CADASTROS_CONFIG = {
  setor: {
    navLabel: "Cadastros",
    pageTitle: "Cadastro de setor / centro de custo",
    pageSubtitle: "Cadastro e manutenção de dados mestres.",
    title: "Cadastro de setor / centro de custo",
    subtitle: "Organização gerencial para relatórios e rastreabilidade.",
    fields: [
      { name: "setor", label: "Setor", type: "text", placeholder: "Administrativo" },
      { name: "centroCusto", label: "Centro de custo", type: "text", placeholder: "CC-ADM" },
      { name: "obra", label: "Obra", type: "select", placeholder: "Selecione a obra", options: [] },
      {
        name: "responsavel",
        label: "Responsável",
        type: "select",
        placeholder: "Selecione o responsável",
        options: [],
      },
      { name: "descricao", label: "Descrição", type: "text", placeholder: "Área administrativa da obra" },
      { name: "status", label: "Status", type: "select", placeholder: "Selecione", options: ["Ativo", "Inativo"] },
    ],
  },

  cargo: {
    navLabel: "Cadastros",
    pageTitle: "Cadastro de cargo / função",
    pageSubtitle: "Cadastro e manutenção de dados mestres.",
    title: "Cadastro de cargo / função",
    subtitle: "Funções ajudam a sugerir EPIs necessários ao colaborador.",
    fields: [
      { name: "nome", label: "Nome", type: "text", placeholder: "Servente" },
      { name: "codigo", label: "Código", type: "text", placeholder: "FUN-001" },
      { name: "setor", label: "Setor", type: "select", placeholder: "Selecione o setor", options: [] },
      {
        name: "risco",
        label: "Risco / observação",
        type: "select",
        placeholder: "Selecione",
        options: ["Baixo", "Médio", "Alto"],
      },
      { name: "episRecomendados", label: "EPIs recomendados", type: "text", placeholder: "Capacete, botina, luva" },
      { name: "status", label: "Status", type: "select", placeholder: "Selecione", options: ["Ativo", "Inativo"] },
    ],
  },

  fornecedor: {
    navLabel: "Cadastros",
    pageTitle: "Cadastro de fornecedor",
    pageSubtitle: "Cadastro e manutenção de dados mestres.",
    title: "Cadastro de fornecedor",
    subtitle: "Fornecedores utilizados nas entradas de estoque.",
    fields: [
      { name: "razaoSocial", label: "Razão social", type: "text", placeholder: "Fornecedor Exemplo Ltda." },
      { name: "cnpj", label: "CNPJ", type: "text", placeholder: "00.000.000/0001-00" },
      { name: "contato", label: "Contato", type: "text", placeholder: "(38) 0000-0000" },
      { name: "email", label: "E-mail", type: "text", placeholder: "compras@fornecedor.com" },
      { name: "categoria", label: "Categoria", type: "text", placeholder: "EPI / Segurança" },
      { name: "status", label: "Status", type: "select", placeholder: "Selecione", options: ["Ativo", "Inativo"] },
    ],
  },

  "categoria-epi": {
    navLabel: "Cadastros",
    pageTitle: "Cadastro de categoria de EPI",
    pageSubtitle: "Cadastro e manutenção de dados mestres.",
    title: "Cadastro de categoria de EPI",
    subtitle: "Padronize agrupamentos e regras dos equipamentos.",
    fields: [
      { name: "categoria", label: "Categoria", type: "text", placeholder: "Proteção da cabeça" },
      { name: "codigo", label: "Código", type: "text", placeholder: "CAT-001" },
      { name: "periodicidade", label: "Periodicidade padrão", type: "text", placeholder: "180 dias" },
      { name: "exigeCA", label: "Exige CA", type: "select", placeholder: "Selecione", options: ["Sim", "Não"] },
      { name: "descricao", label: "Descrição", type: "text", placeholder: "Capacetes e acessórios" },
      { name: "status", label: "Status", type: "select", placeholder: "Selecione", options: ["Ativo", "Inativo"] },
    ],
  },

  "motivo-movimentacao": {
    navLabel: "Cadastros",
    pageTitle: "Cadastro de motivo de movimentação",
    pageSubtitle: "Cadastro e manutenção de dados mestres.",
    title: "Cadastro de motivo de movimentação",
    subtitle: "Motivos padronizados para entrega, troca, devolução e ajuste.",
    fields: [
      { name: "motivo", label: "Motivo", type: "text", placeholder: "Substituição por desgaste" },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        placeholder: "Selecione",
        options: ["Entrada", "Saída / entrega", "Ajuste", "Devolução"],
      },
      {
        name: "exigeJustificativa",
        label: "Exige justificativa",
        type: "select",
        placeholder: "Selecione",
        options: ["Sim", "Não"],
      },
      {
        name: "exigeDevolucao",
        label: "Exige devolução",
        type: "select",
        placeholder: "Selecione",
        options: ["Sim", "Não"],
      },
      {
        name: "impactaEstoque",
        label: "Impacta estoque",
        type: "select",
        placeholder: "Selecione",
        options: ["Sim", "Não"],
      },
      { name: "status", label: "Status", type: "select", placeholder: "Selecione", options: ["Ativo", "Inativo"] },
    ],
  },
};

export const CADASTROS_ORDER = ["setor", "cargo", "fornecedor", "categoria-epi", "motivo-movimentacao"];
