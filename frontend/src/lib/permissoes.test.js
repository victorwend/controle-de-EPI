// Testes dos perfis e permissões (EPI-329). Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MATRIZ_PERMISSOES,
  PERFIL_PADRAO,
  PERFIS,
  podeFazer,
  resumoObras,
  rotuloPerfil,
  validarPermissoes,
} from "./permissoes.js";

test("o perfil Operador não pode mais ser escolhido", () => {
  assert.equal(PERFIS.some((perfil) => perfil.valor === "operador"), false);
  assert.equal(rotuloPerfil("operador"), "Operador (removido)");
});

test("o perfil sugerido no convite existe e é o de menor acesso", () => {
  assert.ok(PERFIS.some((perfil) => perfil.valor === PERFIL_PADRAO));
  const acoes = MATRIZ_PERMISSOES.filter((linha) => linha.perfis.includes(PERFIL_PADRAO));
  assert.equal(acoes.length, 1); // só consultar
});

test("matriz bate com as regras do banco", () => {
  assert.equal(podeFazer("almoxarife", "Entregar EPI, troca e devolução"), true);
  assert.equal(podeFazer("gestor", "Entregar EPI, troca e devolução"), false);
  assert.equal(podeFazer("tecnico_seguranca", "Cadastrar e editar EPIs e CAs"), true);
  assert.equal(podeFazer("almoxarife", "Convidar usuários e mudar permissões"), false);
  assert.equal(podeFazer("administrador", "Convidar usuários e mudar permissões"), true);
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
