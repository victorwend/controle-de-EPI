// Testes dos perfis e permissões (EPI-329). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  abaDaRota,
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
  // Gestor vê as abas, mas não tem nenhuma ação (só consulta).
  assert.equal(permissoesPadrao()[PERFIL_PADRAO].some((acao) => !acao.startsWith("aba_")), false);
});

const ABAS = [
  "aba_entregas",
  "aba_funcionarios",
  "aba_estoque",
  "aba_epis",
  "aba_obras",
  "aba_cadastros",
  "aba_relatorios",
];

test("padrão das caixinhas é igual ao do banco (correções 19 e 20)", () => {
  assert.deepEqual(permissoesPadrao(), {
    almoxarife: [...ABAS, "gerenciar_estoque", "registrar_entregas"],
    tecnico_seguranca: [...ABAS, "gerenciar_epis"],
    gestor: [...ABAS],
  });
  assert.deepEqual(ACOES_CONFIGURAVEIS, [
    ...ABAS,
    "gerenciar_epis",
    "gerenciar_estoque",
    "registrar_entregas",
    "gerenciar_funcionarios",
    "gerenciar_obras",
    "ver_todas_obras",
  ]);
});

test("abaDaRota encontra a aba de cada endereço", () => {
  assert.equal(abaDaRota("/entregas"), "aba_entregas");
  assert.equal(abaDaRota("/entregas/nova"), "aba_entregas");
  assert.equal(abaDaRota("/funcionarios/123/ficha-epi"), "aba_funcionarios");
  assert.equal(abaDaRota("/estoque/locais/novo"), "aba_estoque");
  assert.equal(abaDaRota("/visao-geral"), null);
  assert.equal(abaDaRota("/usuarios"), null);
  // "/obras-x" não é a aba Obras (precisa ser "/obras" ou "/obras/...")
  assert.equal(abaDaRota("/obras-x"), null);
});

test("montarEstado lê as linhas do banco", () => {
  const estado = montarEstado([
    { perfil: "gestor", acao: "gerenciar_epis" },
    { perfil: "gestor", acao: "gerenciar_epis" },
    { perfil: "administrador", acao: "x" },
  ]);
  assert.deepEqual(estado, { almoxarife: [], tecnico_seguranca: [], gestor: ["gerenciar_epis"] });
});

test("dependências: ação marca a sua aba; tirar a aba tira a ação", () => {
  const vazio = { almoxarife: [], tecnico_seguranca: [], gestor: [] };
  let estado = marcarAcao(vazio, "gestor", "gerenciar_obras", true);
  assert.deepEqual(estado.gestor, ["aba_obras", "gerenciar_obras", "ver_todas_obras"]);
  estado = marcarAcao(estado, "gestor", "ver_todas_obras", false);
  assert.deepEqual(estado.gestor, ["aba_obras"]);
  estado = marcarAcao(estado, "gestor", "registrar_entregas", true);
  assert.deepEqual(estado.gestor, ["aba_entregas", "aba_obras", "registrar_entregas"]);
  estado = marcarAcao(estado, "gestor", "aba_entregas", false);
  assert.deepEqual(estado.gestor, ["aba_obras"]);
  assert.deepEqual(perfisAlterados(vazio, estado), ["gestor"]);
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
