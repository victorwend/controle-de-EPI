import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import SePuder from "../../components/SePuder.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { contarInativos, filtrarFuncionarios } from "../../lib/funcionarios.js";
import { rotuloMotivoEntrega } from "../../lib/entregas.js";
import { alternarId, alternarTodos, filtrarEntregas, todosMarcados } from "../../lib/loteEntrega.js";

// Aba Entregas de EPI.
//
// EPI-343 (pedido do Victor, 01/11/2026): a aba ganhou a mesma seleção de
// funcionários da tela Funcionários. Duas visões:
//  - "Funcionários": lista com caixinhas; com alguém marcado aparece a
//    barra "Consultar entregas" (mostra só as entregas deles), "Nova entrega"
//    (quando é 1 só) e "Entregar em lote" (abre o lote já com eles marcados);
//  - "Entregas": todas as entregas, da mais recente para a mais antiga.

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

const abaClasse = (ativa) =>
  `rounded-lg px-4 py-2 text-sm font-medium ${ativa ? "bg-epi-brand text-white" : "border border-epi-border bg-white text-epi-ink"}`;

export default function EntregasLista() {
  const navigate = useNavigate();
  const { pode } = useAuth();
  const [visao, setVisao] = useState("funcionarios");
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [linhas, setLinhas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState(() => new Set());
  // Funcionários cujas entregas estão sendo consultadas (null = todos).
  const [consultando, setConsultando] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("entrega_itens")
        .select(
          "id, quantidade, epis(nome, ca), entregas!inner(funcionario_id, created_at, status, motivo, obras(id, nome), funcionarios(nome, matricula, obras(id, nome)))"
        ),
      supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, status, obra_id, obras(nome)")
        .order("nome"),
      supabase.from("obras").select("id, nome").order("nome"),
    ]).then(([{ data: itensData }, { data: funcionariosData }, { data: obrasData }]) => {
      if (!ativo) return;
      setLinhas(itensData ?? []);
      setFuncionarios(funcionariosData ?? []);
      setObras(obrasData ?? []);
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Quantas entregas (itens) cada funcionário tem — coluna da lista.
  const entregasPorFuncionario = useMemo(() => {
    const contagem = {};
    for (const linha of linhas) {
      const id = linha.entregas?.funcionario_id;
      if (id) contagem[id] = (contagem[id] ?? 0) + 1;
    }
    return contagem;
  }, [linhas]);

  const funcionariosFiltrados = useMemo(
    () => filtrarFuncionarios(funcionarios, { busca, obraId: obraFiltro, mostrarInativos }),
    [busca, obraFiltro, mostrarInativos, funcionarios]
  );
  const quantidadeInativos = contarInativos(funcionarios);

  const linhasFiltradas = useMemo(
    () => filtrarEntregas(linhas, { busca, obraId: obraFiltro, funcionarioIds: consultando }),
    [busca, obraFiltro, linhas, consultando]
  );

  const marcados = funcionarios.filter((f) => selecionados.has(f.id));
  const marcadosAtivos = marcados.filter((f) => f.status === "ativo");

  function consultarEntregas(ids) {
    setConsultando(new Set(ids));
    setBusca("");
    setVisao("entregas");
  }

  function verTodasEntregas() {
    setConsultando(null);
    setVisao("entregas");
  }

  const nomesConsultados = consultando ? funcionarios.filter((f) => consultando.has(f.id)).map((f) => f.nome) : [];

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Entregas de EPI">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Entregas de EPI</h2>
          <p className="mt-1 text-sm text-epi-muted">Selecione funcionários para consultar ou registrar entregas.</p>
        </div>
        <div className="flex gap-3">
          <SePuder acao="registrar_entregas">
            <Link
              to="/entregas/troca-devolucao"
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Troca / devolução
            </Link>
          </SePuder>
          <SePuder acao="registrar_entregas">
            <Link
              to="/entregas/lote"
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Entrega em lote
            </Link>
          </SePuder>
          <SePuder acao="registrar_entregas">
            <Link
              to="/entregas/nova"
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              + Nova entrega
            </Link>
          </SePuder>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setVisao("funcionarios")} className={abaClasse(visao === "funcionarios")}>
          Funcionários
        </button>
        <button type="button" onClick={verTodasEntregas} className={abaClasse(visao === "entregas" && !consultando)}>
          Todas as entregas
        </button>
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder={visao === "funcionarios" ? "Buscar nome, matrícula ou função..." : "Buscar funcionário ou EPI..."}
          className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
        />
        <select
          value={obraFiltro}
          onChange={(event) => setObraFiltro(event.target.value)}
          className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
        >
          <option value="">Todas as obras</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
        {visao === "funcionarios" && (
          <label className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-epi-border px-3 text-sm text-epi-ink">
            <input
              type="checkbox"
              checked={mostrarInativos}
              onChange={(event) => setMostrarInativos(event.target.checked)}
              className="h-4 w-4 accent-epi-brand"
            />
            Mostrar inativos ({quantidadeInativos})
          </label>
        )}
      </div>

      {visao === "funcionarios" && (
        <>
          {selecionados.size > 0 && (
            <div className="mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 rounded-xl border border-epi-brand bg-[#EBF5F0] px-4 py-3">
              <p className="text-sm font-semibold text-epi-ink">{selecionados.size} funcionário(s) selecionado(s)</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSelecionados(new Set())}
                  className="rounded-lg border border-epi-border bg-white px-4 py-2 text-sm font-medium text-epi-ink"
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  onClick={() => consultarEntregas([...selecionados])}
                  className="rounded-lg border border-epi-brand bg-white px-4 py-2 text-sm font-semibold text-epi-brand"
                >
                  Consultar entregas
                </button>
                {pode("registrar_entregas") && marcadosAtivos.length === 1 && marcados.length === 1 && (
                  <button
                    type="button"
                    onClick={() => navigate(`/entregas/nova?funcionario=${encodeURIComponent(marcadosAtivos[0].matricula)}`)}
                    className="rounded-lg border border-epi-brand bg-white px-4 py-2 text-sm font-semibold text-epi-brand"
                  >
                    Nova entrega
                  </button>
                )}
                {pode("registrar_entregas") && marcadosAtivos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/entregas/lote", { state: { funcionarioIds: marcadosAtivos.map((f) => f.id) } })}
                    className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Entregar em lote ({marcadosAtivos.length})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={todosMarcados(selecionados, funcionariosFiltrados)}
                      onChange={() => setSelecionados((atual) => alternarTodos(atual, funcionariosFiltrados))}
                      disabled={funcionariosFiltrados.length === 0}
                      aria-label="Selecionar todos os funcionários da lista"
                      title="Selecionar todos os que estão na lista"
                      className="h-4 w-4 accent-epi-brand"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Funcionário</th>
                  <th className="px-4 py-3 font-medium">Matrícula</th>
                  <th className="px-4 py-3 font-medium">Função</th>
                  <th className="px-4 py-3 font-medium">Obra</th>
                  <th className="px-4 py-3 font-medium">Itens entregues</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading &&
                  funcionariosFiltrados.map((funcionario) => (
                    <tr
                      key={funcionario.id}
                      className={`border-b border-epi-border last:border-0 ${funcionario.status === "ativo" ? "" : "bg-epi-paper"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selecionados.has(funcionario.id)}
                          onChange={() => setSelecionados((atual) => alternarId(atual, funcionario.id))}
                          aria-label={`Selecionar ${funcionario.nome}`}
                          className="h-4 w-4 accent-epi-brand"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-epi-ink">
                        {funcionario.nome}
                        {funcionario.status !== "ativo" && <span className="ml-2 text-xs font-normal text-epi-muted">(inativo)</span>}
                      </td>
                      <td className="px-4 py-3 text-epi-muted">{funcionario.matricula}</td>
                      <td className="px-4 py-3 text-epi-muted">{funcionario.funcao || "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">{funcionario.obras?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">{entregasPorFuncionario[funcionario.id] ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => consultarEntregas([funcionario.id])}
                          className="text-sm font-semibold text-epi-brand"
                        >
                          Consultar entregas
                        </button>
                      </td>
                    </tr>
                  ))}
                {!loading && funcionariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                      Nenhum funcionário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
            Marque um ou mais funcionários para consultar as entregas deles ou entregar em lote.
          </p>
        </>
      )}

      {visao === "entregas" && (
        <>
          {consultando && (
            <div className="mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 rounded-xl border border-epi-border bg-epi-paper px-4 py-3 text-sm">
              <p className="text-epi-ink">
                Entregas de <b>{nomesConsultados.length <= 3 ? nomesConsultados.join(", ") : `${nomesConsultados.length} funcionários`}</b>
              </p>
              <div className="flex gap-4">
                {consultando.size === 1 && (
                  <Link
                    to={`/funcionarios/${funcionarios.find((f) => consultando.has(f.id))?.matricula}/historico`}
                    className="font-semibold text-epi-brand"
                  >
                    Histórico completo (trocas e devoluções) →
                  </Link>
                )}
                <button type="button" onClick={() => setVisao("funcionarios")} className="font-semibold text-epi-brand">
                  ← Voltar aos funcionários
                </button>
                <button type="button" onClick={verTodasEntregas} className="font-semibold text-epi-brand">
                  Ver todas
                </button>
              </div>
            </div>
          )}

          <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Funcionário</th>
                  <th className="px-4 py-3 font-medium">EPI</th>
                  <th className="px-4 py-3 font-medium">CA</th>
                  <th className="px-4 py-3 font-medium">Obra</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Qtd.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-epi-muted">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading &&
                  linhasFiltradas.map((linha) => (
                    <tr key={linha.id} className="border-b border-epi-border last:border-0">
                      <td className="px-4 py-3 text-epi-muted">
                        {linha.entregas?.created_at ? formatarData(linha.entregas.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-epi-ink">{linha.entregas?.funcionarios?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">{linha.epis?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">{linha.epis?.ca ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">
                        {linha.entregas?.obras?.nome ?? linha.entregas?.funcionarios?.obras?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-epi-muted">{rotuloMotivoEntrega(linha.entregas?.motivo)}</td>
                      <td className="px-4 py-3 text-epi-muted">{linha.quantidade}</td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          linha.entregas?.status === "pendente" ? "text-orange-600" : "text-epi-muted"
                        }`}
                      >
                        {linha.entregas?.status === "pendente" ? "Pendente" : "Confirmada"}
                      </td>
                    </tr>
                  ))}
                {!loading && linhasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-epi-muted">
                      Nenhuma entrega encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
            Mostrando {linhasFiltradas.length} de {linhas.length} itens entregues.
          </p>
        </>
      )}

      <p className="mt-1 max-w-[1060px] text-sm text-epi-muted">
        Validação automática de estoque: a entrega é bloqueada quando não houver quantidade suficiente.
      </p>
    </AppShell>
  );
}
