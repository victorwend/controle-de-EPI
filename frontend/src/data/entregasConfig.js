// Conteúdo extraído do protótipo Figma (frame 03.08 — Entregas — Troca e devolução).
// ENTREGAS, FICHA_HISTORICO_POR_FUNCIONARIO e HISTORICO_COMPLETO_POR_FUNCIONARIO
// saíram daqui em 18/09/2026: entrega individual virou dado real (ver
// supabase/07_entregas.sql, EntregasLista.jsx, FichaFuncionario.jsx). O que
// resta aqui é só o que Troca/devolução e Entrega em lote ainda usam,
// enquanto esses dois módulos continuam mock.
//
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
