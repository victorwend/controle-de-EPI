// Testes dos perfis e permissões (EPI-329). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACOES_CONFIGURAVEIS,
  marcarAcao,
  montarEstado,
  PERFIL_PADRAO,
  PERFIS,
  perfisAlterados,
  permissoesPadrao,
  podeFazer,
  resumoObras,
  rotuloPerfil,
  validarPermissoes,
} from "./permissoes.js";

test("o perfil Operador não pode mais ser escolhido", () => {
  assert.equal(PERFIS.some((perfil) => perfil.valor === "operador"), false);
  assert.equal(rotuloPerfil("operador"), "Operador (removido)");
});

test("o perfil sugerido no convite existe e só consulta por padrão", () => {
  assert.ok(PERFIS.some((perfil) => perfil.valor === PERFIL_PADRAO));
  assert.deepEqual(permissoesPadrao()[PERFIL_PADRAO], []);
});

test("padrão das caixinhas é igual ao do banco (correção 19)", () => {
  assert.deepEqual(permissoesPadrao(), {
    almoxarife: ["gerenciar_estoque", "registrar_entregas"],
    tecnico_seguranca: ["gerenciar_epis"],
    gestor: [],
  });
  assert.deepEqual(ACOES_CONFIGURAVEIS, [
    "gerenciar_epis",
    "gerenciar_estoque",
    "registrar_entregas",
    "gerenciar_funcionarios",
    "gerenciar_obras",
    "ver_todas_obras",
  ]);
});

test("montarEstado lê as linhas do banco", () => {
  const estado = montarEstado([
    { perfil: "gestor", acao: "gerenciar_epis" },
    { perfil: "gestor", acao: "gerenciar_epis" },
    { perfil: "administrador", acao: "x" },
  ]);
  assert.deepEqual(estado, { almoxarife: [], tecnico_seguranca: [], gestor: ["gerenciar_epis"] });
});

test("marcar obras marca ver todas; desmarcar ver todas desmarca obras", () => {
  let estado = permissoesPadrao();
  estado = marcarAcao(estado, "gestor", "gerenciar_obras", true);
  assert.deepEqual(estado.gestor, ["gerenciar_obras", "ver_todas_obras"]);
  estado = marcarAcao(estado, "gestor", "ver_todas_obras", false);
  assert.deepEqual(estado.gestor, []);
  estado = marcarAcao(estado, "almoxarife", "registrar_entregas", false);
  assert.deepEqual(estado.almoxarife, ["gerenciar_estoque"]);
  assert.deepEqual(perfisAlterados(permissoesPadrao(), estado), ["almoxarife"]);
});

test("podeFazer: admin pode tudo; os outros conforme as caixinhas", () => {
  assert.equal(podeFazer("administrador", "gerenciar_obras", []), true);
  assert.equal(podeFazer("almoxarife", "registrar_entregas", ["registrar_entregas"]), true);
  assert.equal(podeFazer("gestor", "registrar_entregas", []), false);
  assert.equal(podeFazer("gestor", "registrar_entregas", undefined), false);
});

test("resumo das obras", () => {
  assert.equal(resumoObras("administrador", []), "Todas as obras");
  assert.equal(resumoObras("almoxarife", []), "Nenhuma obra (só vê o que é da sede)");
  assert.equal(resumoObras("gestor", ["Obra B", "Obra A"]), "Obra A, Obra B");
  assert.equal(resumoObras("gestor", ["C", "A", "B", "D"]), "A, B e mais 2");
});

test("validação do formulário de permissões", () => {
  assert.equal(validarPermissoes({ perfil: "gestor", ativo: true }), "");
  assert.match(validarPermissoes({ perfil: "operador", ativo: true }), /Escolha um perfil/);
  // ex-operador: precisa de um perfil novo até para continuar inativo
  assert.match(validarPermissoes({ perfil: "operador", ativo: false }), /Escolha um perfil/);
  assert.match(validarPermissoes({ perfil: "", ativo: false }), /Escolha um perfil/);
  assert.match(
    validarPermissoes({ perfil: "gestor", ativo: true, ehVoceMesmo: true, perfilAtual: "administrador", ativoAtual: true }),
    /próprio perfil/
  );
  assert.equal(
    validarPermissoes({ perfil: "administrador", ativo: true, ehVoceMesmo: true, perfilAtual: "administrador", ativoAtual: true }),
    ""
  );
});
