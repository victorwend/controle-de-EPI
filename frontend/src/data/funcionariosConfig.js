// Conteúdo extraído do protótipo Figma (frame 04.01 — Funcionários — Lista).
// campo biometriaCadastrada: não vem do Figma (a lista original não mostra essa coluna) -
// adicionado para o fluxo de entrega (Sprint 8) poder mostrar de forma realista o estado
// "biometria não cadastrada" (03.09) sem inventar um funcionário novo.
// campo ultimaEntrega: só existe para João Carlos (00487) — é o único funcionário com
// data literal no Figma (04.03/04.04 — "Última entrega: 21/08/2026"). Para os demais,
// nenhum frame mostra essa data; honesto deixar ausente em vez de inventar uma.
export const FUNCIONARIOS = [
  { matricula: "00487", nome: "João Carlos da Silva", funcao: "Servente", obra: "BR-040", episAtivos: 5, pendencias: 0, status: "Ativo", biometriaCadastrada: true, ultimaEntrega: "21/08/2026" },
  { matricula: "00492", nome: "Marcos Lima", funcao: "Pedreiro", obra: "Usina", episAtivos: 4, pendencias: 1, status: "Ativo", biometriaCadastrada: true },
  { matricula: "00502", nome: "Carlos Souza", funcao: "Operador", obra: "Britagem", episAtivos: 6, pendencias: 0, status: "Ativo", biometriaCadastrada: false },
  { matricula: "00511", nome: "André Santos", funcao: "Motorista", obra: "BR-040", episAtivos: 3, pendencias: 2, status: "Ativo", biometriaCadastrada: true },
  { matricula: "00523", nome: "Paulo Mendes", funcao: "Armador", obra: "Usina", episAtivos: 5, pendencias: 0, status: "Ativo", biometriaCadastrada: false },
];
