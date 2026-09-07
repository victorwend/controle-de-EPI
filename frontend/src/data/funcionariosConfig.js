// Conteúdo extraído do protótipo Figma (frame 04.01 — Funcionários — Lista).
// campo biometriaCadastrada: não vem do Figma (a lista original não mostra essa coluna) -
// adicionado para o fluxo de entrega (Sprint 8) poder mostrar de forma realista o estado
// "biometria não cadastrada" (03.09) sem inventar um funcionário novo.
export const FUNCIONARIOS = [
  { matricula: "00487", nome: "João Carlos da Silva", funcao: "Servente", obra: "BR-040", episAtivos: 5, pendencias: 0, status: "Ativo", biometriaCadastrada: true },
  { matricula: "00492", nome: "Marcos Lima", funcao: "Pedreiro", obra: "Usina", episAtivos: 4, pendencias: 1, status: "Ativo", biometriaCadastrada: true },
  { matricula: "00502", nome: "Carlos Souza", funcao: "Operador", obra: "Britagem", episAtivos: 6, pendencias: 0, status: "Ativo", biometriaCadastrada: false },
  { matricula: "00511", nome: "André Santos", funcao: "Motorista", obra: "BR-040", episAtivos: 3, pendencias: 2, status: "Ativo", biometriaCadastrada: true },
  { matricula: "00523", nome: "Paulo Mendes", funcao: "Armador", obra: "Usina", episAtivos: 5, pendencias: 0, status: "Ativo", biometriaCadastrada: false },
];
