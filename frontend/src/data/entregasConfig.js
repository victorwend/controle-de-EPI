// Conteúdo extraído do protótipo Figma (frame 03.01 — Entregas — Lista).
export const ENTREGAS = [
  { funcionario: "João Carlos", matricula: "00487", epi: "Capacete classe B", ca: "12345", obra: "BR-040", data: "30/08/26", qtd: 1, status: "Confirmada" },
  { funcionario: "Marcos Lima", matricula: "00492", epi: "Luva de raspa", ca: "54321", obra: "Usina", data: "30/08/26", qtd: 2, status: "Confirmada" },
  { funcionario: "Carlos Souza", matricula: "00502", epi: "Óculos incolor", ca: "99887", obra: "BR-040", data: "29/08/26", qtd: 1, status: "Pendente" },
  { funcionario: "André Santos", matricula: "00511", epi: "Protetor auricular", ca: "77661", obra: "Britagem", data: "29/08/26", qtd: 1, status: "Confirmada" },
  { funcionario: "Paulo Mendes", matricula: "00523", epi: "Botina segurança", ca: "66554", obra: "Usina", data: "28/08/26", qtd: 1, status: "Confirmada" },
];

export const TOTAL_ENTREGAS_MES = 347;

// EPIs em posse por funcionário, para a tela de Troca e devolução (03.08).
// O Figma mostra a tabela só com dado literal de um colaborador de exemplo
// ("Colaborador ativo • Obra vinculada", sem nome real) — aqui associada a
// João Carlos da Silva (mesmos 3 itens/CAs do frame). Para os demais
// funcionários do mock ainda não há posse detalhada por item; honesto mostrar
// vazio a inventar dado que o protótipo nunca desenhou.
export const POSSE_POR_FUNCIONARIO = {
  "00487": [
    { epi: "Capacete classe B", ca: "12345" },
    { epi: "Luva de raspa", ca: "54321" },
    { epi: "Óculos incolor", ca: "99887" },
  ],
};

// Histórico condensado (frame 04.03 — Ficha, seção "Histórico de entregas"): só
// entregas, com o responsável real que registrou cada uma. Só João Carlos (00487)
// tem esse histórico desenhado no Figma.
export const FICHA_HISTORICO_POR_FUNCIONARIO = {
  "00487": [
    { data: "21/08/26", epi: "Capacete classe B", ca: "12345", qtd: 1, responsavel: "Victor" },
    { data: "10/08/26", epi: "Luva de raspa", ca: "54321", qtd: 2, responsavel: "Eduardo" },
    { data: "01/08/26", epi: "Óculos incolor", ca: "99887", qtd: 1, responsavel: "Victor" },
    { data: "15/07/26", epi: "Protetor auricular", ca: "77661", qtd: 1, responsavel: "Vinicius" },
  ],
};

// Histórico completo (frame 04.04 — Histórico completo): todos os tipos de
// movimentação (entrega/troca/devolução), responsável genérico "Usuário" e
// confirmação por biometria — igual ao Figma. Só João Carlos (00487) tem esse
// histórico desenhado.
export const HISTORICO_COMPLETO_POR_FUNCIONARIO = {
  "00487": [
    { data: "21/08/26", tipo: "Entrega", epi: "Capacete classe B", ca: "12345", qtd: 1, confirmacao: "Biometria", responsavel: "Usuário" },
    { data: "10/08/26", tipo: "Troca", epi: "Luva de raspa", ca: "54321", qtd: 2, confirmacao: "Biometria", responsavel: "Usuário" },
    { data: "10/08/26", tipo: "Devolução", epi: "Luva de raspa", ca: "54321", qtd: 2, confirmacao: "Biometria", responsavel: "Usuário" },
    { data: "01/08/26", tipo: "Entrega", epi: "Óculos incolor", ca: "99887", qtd: 1, confirmacao: "Biometria", responsavel: "Usuário" },
    { data: "15/07/26", tipo: "Entrega", epi: "Protetor auricular", ca: "77661", qtd: 1, confirmacao: "Biometria", responsavel: "Usuário" },
  ],
};
