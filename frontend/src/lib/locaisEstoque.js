// Regras sobre locais de estoque (EPI-325). Funções puras, testadas em
// locaisEstoque.test.js.

import { simplificar } from "./importacaoFuncionarios.js";

export const NOME_LOCAL_PREFERIDO = "Almoxarifado Central";

// Qual local já vem selecionado quando a tela abre:
//  1) o "Almoxarifado Central", se existir (era o único usado antes);
//  2) senão, o primeiro da lista (que já vem em ordem alfabética).
// Só entram locais ATIVOS: local inativo não pode receber nem entregar EPI.
export function escolherLocalPadrao(locais) {
  const ativos = (locais ?? []).filter((local) => (local.status ?? "ativo") === "ativo");
  if (ativos.length === 0) return null;
  const preferido = ativos.find((local) => simplificar(local.nome) === simplificar(NOME_LOCAL_PREFERIDO));
  return preferido ?? ativos[0];
}
