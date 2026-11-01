// Motivo da entrega e baixa no desligamento (EPI-340).
// Funções puras, testadas em entregas.test.js. Quem garante as regras é o
// banco (correção 24); aqui a tela mostra as opções e confere antes.

// Mesmos valores aceitos pelo banco (entregas.motivo).
export const MOTIVOS_ENTREGA = [
  { valor: "admissao", label: "Admissão" },
  { valor: "troca", label: "Troca" },
  { valor: "desgaste", label: "Desgaste natural" },
  { valor: "perda", label: "Perda" },
];

export function rotuloMotivoEntrega(motivo) {
  return MOTIVOS_ENTREGA.find((item) => item.valor === motivo)?.label ?? "Não informado";
}

export function motivoValido(motivo) {
  return MOTIVOS_ENTREGA.some((item) => item.valor === motivo);
}

// Sugestão ao abrir a entrega: quem nunca recebeu EPI está chegando
// (admissão). Para os outros, a pessoa escolhe (sem chute).
export function motivoSugerido(jaRecebeuAntes) {
  return jaRecebeuAntes ? "" : "admissao";
}

// Destinos da baixa (trocas_devolucoes_itens.destino).
export const DESTINOS_BAIXA = [
  { valor: "estoque", label: "Devolvido ao estoque" },
  { valor: "descarte", label: "Descartado (sem condição de uso)" },
  { valor: "perda", label: "Perda / extravio (não devolvido)" },
];

export function rotuloDestino(destino) {
  return DESTINOS_BAIXA.find((item) => item.valor === destino)?.label ?? destino ?? "—";
}

// Monta a baixa padrão do desligamento: uma linha por EPI em posse,
// com a quantidade toda e destino ainda não escolhido.
// posse: [{ epi_id, quantidade, epis: { nome, ca } }]
export function baixaInicial(posse) {
  return (posse ?? [])
    .filter((linha) => (linha.quantidade ?? 0) > 0)
    .map((linha) => ({
      epiId: linha.epi_id,
      nome: linha.epis?.nome ?? "EPI",
      ca: linha.epis?.ca ?? "",
      quantidade: linha.quantidade,
      destino: "",
    }));
}

// Confere a baixa antes de enviar. Devolve a mensagem de erro ou "".
export function validarBaixa(baixa, localId) {
  for (const item of baixa ?? []) {
    if (!item.destino) return `Escolha o destino de "${item.nome}".`;
  }
  if ((baixa ?? []).some((item) => item.destino === "estoque") && !localId) {
    return "Escolha o local de estoque que vai receber os EPIs devolvidos.";
  }
  return "";
}

// Formato que a função desligar_funcionario do banco espera.
export function baixaParaSalvar(baixa) {
  return (baixa ?? []).map((item) => ({ epi_id: item.epiId, quantidade: item.quantidade, destino: item.destino }));
}
