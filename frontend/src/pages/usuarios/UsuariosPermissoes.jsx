import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  MATRIZ_PERMISSOES,
  PERFIS,
  perfilValido,
  resumoObras,
  rotuloPerfil,
  validarPermissoes,
} from "../../lib/permissoes.js";

// Usuários e permissões (EPI-329).
//
// Mostra quem tem acesso ao sistema, com qual PERFIL (o que pode fazer)
// e em quais OBRAS (onde pode fazer), e deixa o administrador dar e tirar
// permissões. Quem garante as regras é o banco (correção 17): esta tela
// só chama a função atualizar_permissoes_usuario.

const FILTRO_INATIVOS = "inativos";

export default function UsuariosPermissoes() {
  const { usuario } = useAuth();
  const ehAdministrador = usuario?.perfil === "administrador";

  const [usuarios, setUsuarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [obrasPorUsuario, setObrasPorUsuario] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [editandoId, setEditandoId] = useState("");
  const [formulario, setFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function carregar() {
    const [{ data: usuariosData }, { data: obrasData }, { data: vinculosData }] = await Promise.all([
      supabase.from("usuarios").select("id, nome_completo, email, perfil, status").order("nome_completo"),
      supabase.from("obras").select("id, nome").order("nome"),
      supabase.from("usuario_obras").select("usuario_id, obra_id"),
    ]);

    const mapa = {};
    for (const vinculo of vinculosData ?? []) {
      (mapa[vinculo.usuario_id] ??= []).push(vinculo.obra_id);
    }
    setUsuarios(usuariosData ?? []);
    setObras(obrasData ?? []);
    setObrasPorUsuario(mapa);
    setCarregando(false);
  }

  useEffect(() => {
    if (ehAdministrador) carregar();
  }, [ehAdministrador]);

  const nomeDaObra = useMemo(() => Object.fromEntries(obras.map((obra) => [obra.id, obra.nome])), [obras]);

  // Quantos usuários ATIVOS há em cada perfil (os "botões" de filtro).
  const contagem = useMemo(() => {
    const resultado = { [FILTRO_INATIVOS]: 0 };
    for (const item of usuarios) {
      if (item.status !== "ativo") resultado[FILTRO_INATIVOS] += 1;
      else resultado[item.perfil] = (resultado[item.perfil] ?? 0) + 1;
    }
    return resultado;
  }, [usuarios]);

  const usuariosVisiveis = useMemo(() => {
    if (!filtro) return usuarios;
    if (filtro === FILTRO_INATIVOS) return usuarios.filter((item) => item.status !== "ativo");
    return usuarios.filter((item) => item.status === "ativo" && item.perfil === filtro);
  }, [usuarios, filtro]);

  function abrirEdicao(item) {
    setErro("");
    setAviso("");
    setEditandoId(item.id);
    setFormulario({
      // Ex-operador começa sem perfil: o admin precisa escolher um novo.
      perfil: perfilValido(item.perfil) ? item.perfil : "",
      ativo: item.status === "ativo",
      obras: Object.fromEntries((obrasPorUsuario[item.id] ?? []).map((id) => [id, true])),
    });
  }

  function fecharEdicao() {
    setEditandoId("");
    setFormulario(null);
  }

  function alternarObra(obraId) {
    setFormulario((atual) => ({ ...atual, obras: { ...atual.obras, [obraId]: !atual.obras[obraId] } }));
  }

  async function salvar(item) {
    const ehVoceMesmo = item.id === usuario?.id;
    const mensagem = validarPermissoes({
      perfil: formulario.perfil,
      ativo: formulario.ativo,
      ehVoceMesmo,
      perfilAtual: item.perfil,
      ativoAtual: item.status === "ativo",
    });
    if (mensagem) {
      setErro(mensagem);
      return;
    }

    setErro("");
    setSalvando(true);
    const obraIds = Object.keys(formulario.obras).filter((id) => formulario.obras[id]);
    const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
      p_usuario_id: item.id,
      p_perfil: formulario.perfil,
      p_ativo: formulario.ativo,
      p_obra_ids: obraIds,
    });
    setSalvando(false);

    if (error) {
      // A mensagem do banco já explica o motivo.
      setErro(error.message || "Não foi possível salvar as permissões.");
      return;
    }
    setAviso(`Permissões de "${item.nome_completo}" salvas.`);
    fecharEdicao();
    carregar();
  }

  if (usuario && !ehAdministrador) {
    return (
      <AppShell title="Usuários e permissões" activeSection="Usuários e permissões">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          Só o Administrador da empresa gerencia usuários e permissões.
        </div>
      </AppShell>
    );
  }

  const botoesFiltro = [
    { valor: "", label: "Todos", total: usuarios.length },
    ...PERFIS.map((perfil) => ({ valor: perfil.valor, label: perfil.label, total: contagem[perfil.valor] ?? 0 })),
    { valor: FILTRO_INATIVOS, label: "Inativos", total: contagem[FILTRO_INATIVOS] },
  ];

  return (
    <AppShell
      title="Usuários e permissões"
      subtitle="Quem acessa o sistema, o que pode fazer e em quais obras."
      activeSection="Usuários e permissões"
    >
      <div className="mb-6 flex max-w-[1060px] items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Usuários</h2>
          <p className="mt-1 text-sm text-epi-muted">
            O <b>perfil</b> diz o que a pessoa pode fazer; as <b>obras</b> dizem onde. Usuário inativo não entra no
            sistema.
          </p>
        </div>
        <Link
          to="/cadastros/usuario"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Convidar usuário
        </Link>
      </div>

      <div className="mb-4 flex max-w-[1060px] flex-wrap gap-2">
        {botoesFiltro.map((botao) => (
          <button
            key={botao.valor || "todos"}
            type="button"
            onClick={() => setFiltro(botao.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filtro === botao.valor
                ? "border-epi-brand bg-epi-brand font-semibold text-white"
                : "border-epi-border bg-white text-epi-ink hover:bg-epi-paper"
            }`}
          >
            {botao.label} ({botao.total})
          </button>
        ))}
      </div>

      {erro && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
      )}
      {aviso && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>
      )}

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-epi-border text-xs uppercase text-epi-muted">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Perfil</th>
              <th className="px-4 py-3">Obras liberadas</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-epi-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && usuariosVisiveis.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-epi-muted">
                  Nenhum usuário neste filtro.
                </td>
              </tr>
            )}
            {!carregando &&
              usuariosVisiveis.map((item) => {
                const ativo = item.status === "ativo";
                const ehVoceMesmo = item.id === usuario?.id;
                const nomesObras = (obrasPorUsuario[item.id] ?? []).map((id) => nomeDaObra[id]).filter(Boolean);
                const editando = editandoId === item.id;
                return (
                  <FragmentoUsuario
                    key={item.id}
                    item={item}
                    ativo={ativo}
                    ehVoceMesmo={ehVoceMesmo}
                    resumo={resumoObras(item.perfil, nomesObras)}
                    editando={editando}
                    formulario={editando ? formulario : null}
                    obras={obras}
                    salvando={salvando}
                    onEditar={() => abrirEdicao(item)}
                    onCancelar={fecharEdicao}
                    onSalvar={() => salvar(item)}
                    onMudar={(campo, valor) => setFormulario((atual) => ({ ...atual, [campo]: valor }))}
                    onAlternarObra={alternarObra}
                  />
                );
              })}
          </tbody>
        </table>
      </div>

      <section className="mt-10 max-w-[1060px]">
        <h2 className="text-lg font-semibold text-epi-ink">O que cada perfil pode fazer</h2>
        <p className="mt-1 text-sm text-epi-muted">
          Estas regras são garantidas pelo banco de dados. Fora o Administrador, cada perfil só vê e opera as obras
          liberadas para ele (e o que é da sede, sem obra).
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-epi-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <tr>
                <th className="px-4 py-3">Ação</th>
                {PERFIS.map((perfil) => (
                  <th key={perfil.valor} className="px-4 py-3 text-center">
                    {perfil.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIZ_PERMISSOES.map((linha) => (
                <tr key={linha.acao} className="border-b border-epi-border last:border-0">
                  <td className="px-4 py-3 text-epi-ink">
                    {linha.acao}
                    <span className="block text-xs text-epi-muted">{linha.regra}</span>
                  </td>
                  {PERFIS.map((perfil) => (
                    <td key={perfil.valor} className="px-4 py-3 text-center">
                      {linha.perfis.includes(perfil.valor) ? (
                        <span className="font-semibold text-green-700" aria-label="pode">
                          ✓
                        </span>
                      ) : (
                        <span className="text-epi-muted" aria-label="não pode">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

// Uma linha da tabela + (quando está editando) o formulário logo abaixo.
function FragmentoUsuario({
  item,
  ativo,
  ehVoceMesmo,
  resumo,
  editando,
  formulario,
  obras,
  salvando,
  onEditar,
  onCancelar,
  onSalvar,
  onMudar,
  onAlternarObra,
}) {
  return (
    <>
      <tr className="border-b border-epi-border last:border-0">
        <td className="px-4 py-3">
          <p className="font-medium text-epi-ink">
            {item.nome_completo}
            {ehVoceMesmo && <span className="ml-2 rounded bg-epi-paper px-1.5 py-0.5 text-xs text-epi-muted">você</span>}
          </p>
          <p className="text-xs text-epi-muted">{item.email}</p>
        </td>
        <td className="px-4 py-3 text-epi-ink">{rotuloPerfil(item.perfil)}</td>
        <td className="px-4 py-3 text-epi-muted">{resumo}</td>
        <td className={`px-4 py-3 font-medium ${ativo ? "text-green-700" : "text-epi-muted"}`}>
          {ativo ? "Ativo" : "Inativo"}
        </td>
        <td className="px-4 py-3 text-right">
          {!editando && (
            <button type="button" onClick={onEditar} className="font-semibold text-epi-brand">
              Editar permissões
            </button>
          )}
        </td>
      </tr>

      {editando && formulario && (
        <tr className="border-b border-epi-border bg-epi-paper">
          <td colSpan={5} className="px-4 py-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <label className="block text-[13px] font-medium text-epi-ink">
                Perfil
                <select
                  value={formulario.perfil}
                  disabled={ehVoceMesmo}
                  onChange={(event) => onMudar("perfil", event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-epi-border bg-white px-3 text-sm text-epi-ink disabled:bg-epi-paper"
                >
                  {!perfilValido(formulario.perfil) && <option value="">Escolha um perfil...</option>}
                  {PERFIS.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
                {item.perfil === "operador" && (
                  <span className="mt-1 block text-xs text-epi-muted">
                    O perfil Operador foi removido. Escolha um perfil novo.
                  </span>
                )}
              </label>

              <div>
                <p className="text-[13px] font-medium text-epi-ink">Obras liberadas</p>
                {formulario.perfil === "administrador" ? (
                  <p className="mt-2 text-sm text-epi-muted">Administrador vê todas as obras.</p>
                ) : (
                  <div className="mt-2 max-h-[140px] space-y-2 overflow-y-auto rounded-lg border border-epi-border bg-white p-3">
                    {obras.length === 0 && <p className="text-sm text-epi-muted">Nenhuma obra cadastrada.</p>}
                    {obras.map((obra) => (
                      <label key={obra.id} className="flex items-center gap-2 text-sm text-epi-ink">
                        <input
                          type="checkbox"
                          checked={Boolean(formulario.obras[obra.id])}
                          onChange={() => onAlternarObra(obra.id)}
                          className="h-4 w-4 accent-epi-brand"
                        />
                        {obra.nome}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[13px] font-medium text-epi-ink">Situação</p>
                <div className="mt-2 space-y-2 text-sm text-epi-ink">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formulario.ativo}
                      disabled={ehVoceMesmo}
                      onChange={() => onMudar("ativo", true)}
                    />
                    Ativo (pode entrar no sistema)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!formulario.ativo}
                      disabled={ehVoceMesmo}
                      onChange={() => onMudar("ativo", false)}
                    />
                    Inativo (acesso bloqueado)
                  </label>
                </div>
                {ehVoceMesmo && (
                  <p className="mt-2 text-xs text-epi-muted">
                    Você não pode mudar o seu próprio perfil nem se inativar. Peça a outro administrador.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancelar}
                className="rounded-lg border border-epi-border bg-white px-4 py-2 text-sm font-medium text-epi-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={onSalvar}
                className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar permissões"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
