// Conteúdo extraído do protótipo Figma (frames 06.01 — Lista, 06.03 — Matriz EPI x Função).
export const EPIS = [
  { nome: "Capacete classe B", categoria: "Cabeça", ca: "12345", fabricante: "MSA", validadeCA: "15/12/26", periodicidade: "12 meses", status: "Válido" },
  { nome: "Luva de raspa", categoria: "Mãos", ca: "54321", fabricante: "Kalipso", validadeCA: "10/09/26", periodicidade: "6 meses", status: "A vencer" },
  { nome: "Óculos incolor", categoria: "Olhos", ca: "99887", fabricante: "Delta Plus", validadeCA: "22/01/27", periodicidade: "12 meses", status: "Válido" },
  { nome: "Protetor auricular", categoria: "Audição", ca: "77661", fabricante: "3M", validadeCA: "05/09/26", periodicidade: "6 meses", status: "A vencer" },
  { nome: "Botina segurança", categoria: "Pés", ca: "66554", fabricante: "Marluvas", validadeCA: "30/03/27", periodicidade: "12 meses", status: "Válido" },
];

export const FUNCOES_MATRIZ = ["Servente", "Pedreiro", "Operador", "Motorista", "Armador"];

// Só a função "Servente" tem matriz desenhada no Figma; as demais ficam vazias
// (honesto: nada inventado) até a validação com SST definir o padrão de cada uma.
export const MATRIZ_POR_FUNCAO = {
  Servente: [
    { epi: "Capacete classe B", ca: "12345", obrigatoriedade: "Obrigatório", periodicidade: "12 meses", quantidade: 1 },
    { epi: "Luva de raspa", ca: "54321", obrigatoriedade: "Obrigatório", periodicidade: "3 meses", quantidade: 2 },
    { epi: "Óculos incolor", ca: "99887", obrigatoriedade: "Obrigatório", periodicidade: "6 meses", quantidade: 1 },
    { epi: "Protetor auricular", ca: "77661", obrigatoriedade: "Obrigatório", periodicidade: "6 meses", quantidade: 1 },
    { epi: "Colete refletivo", ca: "66550", obrigatoriedade: "Recomendado", periodicidade: "12 meses", quantidade: 1 },
  ],
};
