import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import SePuder from "../../components/SePuder.jsx";
import { filtrarFuncionarios } from "../../lib/funcionarios.js";
import { itensDaPagina } from "../../lib/paginacao.js";
import Paginacao from "../../components/Paginacao.jsx";
import { rotuloMotivoEntrega } from "../../lib/entregas.js";
import {
  alternarId,
  alternarTodos,
  filtrarEntregas,
  funcionariosDasLinhasMarcadas,
  todosMarcados,
} from "../../lib/loteEntrega.js";
import { agruparItensPorFuncionario, emPedacos } from "../../lib/fichaEpi.js";
import { formatarDataHora } from "../../lib/termoRecebimento.js";
import {
  agruparTrocasPorFuncionario,
  filtrarHistorico,
  FILTROS_HISTORICO,
  montarHistoricoDeVarios,
  SELECT_ENTREGAS,
  SELECT_TROCAS,
} from "../../lib/historicoEpi.js";

// Aba Entregas de EPI: todas as entregas, da mais recente para a mais antiga.
//
// EPI-344 (pedido do Victor, 01/11/2026): a lista de funcionários com
// caixinhas que a EPI-343 colocou aqui repetia a aba Funcionários e saiu.
// Ficou só a lista de entregas + "Consultar entregas de um funcionário":
// busca o funcionário (ativo ou inativo) e a lista mostra só as entregas
// dele. Clicar no nome de alguém na lista faz o mesmo.
//
// EPI-345 (pedido do Victor, 01/11/2026): caixinha em cada linha, igual à
// aba Funcionários. A caixinha marca o FUNCIONÁRIO da linha (todas as linhas
// dele ficam marcadas). Com alguém marcado aparece "Consultar entregas", que
// mostra o HISTÓRICO COMPLETO de movimentações dos marcados: entregas,
// trocas, devoluções e baixas (mesma montagem da ficha, EPI-342).
// A consulta pela busca e o clique no nome também abrem esse histórico.
//
// EPI-347: a caixinha marca só a PRÓPRIA LINHA (antes marcava o funcionário
// e acendia todas as linhas dele, parecendo que marcava as dos outros).
// "Consultar entregas" usa os funcionários das linhas marcadas.
//
// EPI-348: a lista e o histórico mostram 10 linhas por vez, com o índice
// de páginas "‹ Anterior 1 2 3 … 10 Próxima ›" embaixo (components/Paginacao.jsx).

export default function EntregasLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscaFuncionario, setBuscaFuncionario] = useState("");
  // Linhas (itens entregues) marcadas com a caixinha (EPI-347: por linha).
  const [selecionados, setSelecionados] = useState(() => new Set());
  // Histórico aberto: lista de funcionários consultados (null = lista de entregas).
  const [consultados, setConsultados] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState("");
  const [filtroHistorico, setFiltroHistorico] = useState("");
  // EPI-348: página atual da lista e do histórico.
  const [pagina, setPagina] = useState(1);
  const [paginaHistorico, setPaginaHistorico] = useState(1);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("entrega_itens")
        .select(
          "id, quantidade, epis(nome, ca), entregas!inner(funcionario_id, created_at, status, motivo, obras(id, nome), funcionarios(nome, matricula, obras(id, nome)))"
        ),
      supabase.from("funcionarios").select("id, matricula, nome, funcao, status, obra_id, obras(nome)").order("nome"),
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

  // Sugestões da busca de funcionário (ativos e inativos, no máximo 8).
  const sugestoes = useMemo(() => {
    if (!buscaFuncionario.trim()) return [];
    return filtrarFuncionarios(funcionarios, { busca: buscaFuncionario, mostrarInativos: true }).slice(0, 8);
  }, [buscaFuncionario, funcionarios]);

  const linhasFiltradas = useMemo(
    () => filtrarEntregas(linhas, { busca, obraId: obraFiltro }),
    [busca, obraFiltro, linhas]
  );
  const linhasDaPagina = itensDaPagina(linhasFiltradas, pagina);
  const funcionariosMarcados = useMemo(() => funcionariosDasLinhasMarcadas(linhas, selecionados), [linhas, selecionados]);

  // Busca entregas E trocas/devoluções/baixas dos funcionários escolhidos.
  async function consultar(lista) {
    setConsultados(lista);
    setBuscaFuncionario("");
    setFiltroHistorico("");
    setPaginaHistorico(1);
    setErroHistorico("");
    setHistorico([]);
    setCarregandoHistorico(true);
    try {
      const ids = lista.map((f) => f.id);
      const itens = [];
      const trocas = [];
      for (const pedaco of emPedacos(ids, 100)) {
        const [{ data, error }, { data: trocasData, error: erroTrocas }] = await Promise.all([
          supabase.from("entrega_itens").select(SELECT_ENTREGAS).in("entregas.funcionario_id", pedaco),
          supabase.from("trocas_devolucoes_itens").select(SELECT_TROCAS).in("funcionario_id", pedaco),
        ]);
        if (error) throw error;
        if (erroTrocas) throw erroTrocas;
        itens.push(...(data ?? []));
        trocas.push(...(trocasData ?? []));
      }
      setHistorico(
        montarHistoricoDeVarios(lista, agruparItensPorFuncionario(itens), agruparTrocasPorFuncionario(trocas))
      );
    } catch (erro) {
      setErroHistorico("Não foi possível carregar o histórico: " + (erro?.message ?? "erro desconhecido"));
    } finally {
      setCarregandoHistorico(false);
    }
  }

  function consultarPorIds(ids) {
    const lista = funcionarios.filter((f) => ids.includes(f.id));
    if (lista.length > 0) consultar(lista);
  }

  function fecharHistorico() {
    setConsultados(null);
    setHistorico([]);
  }

  const historicoFiltrado = useMemo(() => filtrarHistorico(historico, filtroHistorico), [historico, filtroHistorico]);
  const historicoDaPagina = itensDaPagina(historicoFiltrado, paginaHistorico);
  const umSo = consultados?.length === 1 ? consultados[0] : null;

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Entregas de EPI">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Entregas de EPI</h2>
          <p className="mt-1 text-sm text-epi-muted">Consulte e registre todas as entregas realizadas aos colaboradores.</p>
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

      {consultados === null && (
        <>
          {/* Consultar entregas de um funcionário pela busca */}
          <div className="relative mb-4 max-w-[1060px] rounded-xl border border-epi-border bg-white p-4">
            <label className="block text-[13px] font-medium text-epi-ink">
              Consultar entregas de um funcionário
              <input
                type="text"
                value={buscaFuncionario}
                onChange={(event) => setBuscaFuncionario(event.target.value)}
                placeholder="Digite o nome, a matrícula ou a função..."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>
            {buscaFuncionario.trim() && (
              <div className="absolute left-4 right-4 z-10 mt-1 rounded-lg border border-epi-border bg-white shadow-lg">
                {sugestoes.length === 0 && <p className="px-3 py-2 text-sm text-epi-muted">Nenhum funcionário encontrado.</p>}
                {sugestoes.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => consultar([f])}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-epi-paper"
                  >
                    <span className="font-medium text-epi-ink">{f.nome}</span>
                    <span className="text-xs text-epi-muted">
                      {" "}
                      • {f.matricula} • {f.funcao || "sem função"} • {f.obras?.nome ?? "sem obra"}
                      {f.status !== "ativo" && " • inativo"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4 flex max-w-[1060px] gap-3">
            <input
              type="text"
              value={busca}
              onChange={(event) => {
                setBusca(event.target.value);
                setPagina(1);
              }}
              placeholder="Filtrar por funcionário ou EPI..."
              className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
            <select
              value={obraFiltro}
              onChange={(event) => {
                setObraFiltro(event.target.value);
                setPagina(1);
              }}
              className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>

          {/* EPI-345/347: barra que aparece com linhas marcadas */}
          {selecionados.size > 0 && (
            <div className="mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 rounded-xl border border-epi-brand bg-[#EBF5F0] px-4 py-3">
              <p className="text-sm font-semibold text-epi-ink">
                {selecionados.size} entrega(s) selecionada(s)
                <span className="font-normal text-epi-muted"> • {funcionariosMarcados.length} funcionário(s)</span>
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelecionados(new Set())}
                  className="rounded-lg border border-epi-border bg-white px-4 py-2 text-sm font-medium text-epi-ink"
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  onClick={() => consultarPorIds(funcionariosMarcados)}
                  className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Consultar entregas
                </button>
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
                      checked={todosMarcados(selecionados, linhasDaPagina)}
                      onChange={() => setSelecionados((atual) => alternarTodos(atual, linhasDaPagina))}
                      disabled={linhasDaPagina.length === 0}
                      aria-label="Selecionar todas as entregas desta página"
                      title="Selecionar todas as entregas desta página"
                      className="h-4 w-4 accent-epi-brand"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Data e hora</th>
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
                    <td colSpan={9} className="px-4 py-6 text-center text-epi-muted">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading &&
                  linhasDaPagina.map((linha) => {
                    const funcionarioId = linha.entregas?.funcionario_id;
                    const marcado = selecionados.has(linha.id);
                    return (
                      <tr
                        key={linha.id}
                        className={`border-b border-epi-border last:border-0 ${marcado ? "bg-[#F4FAF7]" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => setSelecionados((atual) => alternarId(atual, linha.id))}
                            aria-label={`Selecionar ${linha.entregas?.funcionarios?.nome ?? "funcionário"}`}
                            className="h-4 w-4 accent-epi-brand"
                          />
                        </td>
                        <td className="px-4 py-3 text-epi-muted">
                          {linha.entregas?.created_at ? formatarDataHora(linha.entregas.created_at) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => consultarPorIds([funcionarioId])}
                            title="Ver o histórico completo deste funcionário"
                            className="text-left font-medium text-epi-ink hover:text-epi-brand hover:underline"
                          >
                            {linha.entregas?.funcionarios?.nome ?? "—"}
                          </button>
                        </td>
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
                    );
                  })}
                {!loading && linhasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-epi-muted">
                      Nenhuma entrega encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <Paginacao pagina={pagina} quantidade={linhasFiltradas.length} onMudar={setPagina} rotulo="itens entregues" />
          )}

          <p className="mt-3 max-w-[1060px] text-sm text-epi-muted">
            Marque as caixinhas e clique em{" "}
            <b>Consultar entregas</b> para ver todo o histórico (entregas, trocas, devoluções e baixas) dos
            funcionários das linhas marcadas. Clicar no nome faz o mesmo para uma pessoa.
          </p>
          <p className="mt-1 max-w-[1060px] text-sm text-epi-muted">
            Validação automática de estoque: a entrega é bloqueada quando não houver quantidade suficiente.
          </p>
        </>
      )}

      {/* EPI-345: histórico completo dos funcionários consultados */}
      {consultados !== null && (
        <>
          <div className="mb-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3 rounded-xl border border-epi-border bg-white p-4">
            <div>
              <p className="text-xs text-epi-muted">Histórico completo de movimentações de</p>
              {umSo ? (
                <p className="text-sm font-semibold text-epi-ink">
                  {umSo.nome}
                  <span className="font-normal text-epi-muted">
                    {" "}
                    • matrícula {umSo.matricula} • {umSo.obras?.nome ?? "sem obra"}
                    {umSo.status !== "ativo" && " • inativo"}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-epi-ink">
                  {consultados.length} funcionários
                  <span className="block text-xs font-normal text-epi-muted">
                    {consultados.map((f) => f.nome).join(", ")}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {umSo && (
                <Link to={`/funcionarios/${umSo.matricula}`} className="font-semibold text-epi-brand">
                  Abrir ficha
                </Link>
              )}
              {umSo && (
                <Link to={`/funcionarios/${umSo.matricula}/ficha-epi`} className="font-semibold text-epi-brand">
                  Imprimir ficha de EPI
                </Link>
              )}
              {umSo?.status === "ativo" && (
                <SePuder acao="registrar_entregas">
                  <Link
                    to={`/entregas/nova?funcionario=${encodeURIComponent(umSo.matricula)}`}
                    className="font-semibold text-epi-brand"
                  >
                    + Nova entrega para ele
                  </Link>
                </SePuder>
              )}
              <button
                type="button"
                onClick={fecharHistorico}
                className="rounded-lg border border-epi-border bg-white px-3 py-1.5 font-medium text-epi-ink"
              >
                ← Voltar às entregas
              </button>
            </div>
          </div>

          <div className="mb-4 flex max-w-[1060px] flex-wrap gap-2">
            {FILTROS_HISTORICO.map((f) => (
              <button
                key={f.valor || "todos"}
                type="button"
                onClick={() => {
                  setFiltroHistorico(f.valor);
                  setPaginaHistorico(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  filtroHistorico === f.valor ? "bg-[#EBF5F0] text-epi-brand" : "border border-epi-border bg-white text-epi-ink"
                }`}
              >
                {f.label} ({filtrarHistorico(historico, f.valor).length})
              </button>
            ))}
          </div>

          {erroHistorico && (
            <p className="mb-4 max-w-[1060px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erroHistorico}</p>
          )}

          <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="px-4 py-3 font-medium">Data e hora</th>
                  {!umSo && <th className="px-4 py-3 font-medium">Funcionário</th>}
                  <th className="px-4 py-3 font-medium">Movimentação</th>
                  <th className="px-4 py-3 font-medium">EPI / CA</th>
                  <th className="px-4 py-3 font-medium">Qtd.</th>
                  <th className="px-4 py-3 font-medium">Obra</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {carregandoHistorico && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                      Carregando histórico...
                    </td>
                  </tr>
                )}
                {!carregandoHistorico &&
                  historicoDaPagina.map((linha) => (
                    <tr key={linha.id} className="border-b border-epi-border last:border-0">
                      <td className="px-4 py-3 text-epi-muted">{linha.data ? formatarDataHora(linha.data) : "—"}</td>
                      {!umSo && <td className="px-4 py-3 font-medium text-epi-ink">{linha.funcionarioNome}</td>}
                      <td className="px-4 py-3 text-epi-ink">
                        <span className="font-medium">{linha.tipo}</span>
                        <span className="block text-xs text-epi-muted">{linha.detalhe}</span>
                        {linha.observacao && <span className="block text-xs text-epi-muted">Obs.: {linha.observacao}</span>}
                      </td>
                      <td className="px-4 py-3 text-epi-muted">
                        {linha.epi} • CA {linha.ca || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          linha.sinal === "+" ? "text-green-700" : linha.sinal === "−" ? "text-red-700" : "text-epi-muted"
                        }`}
                      >
                        {linha.sinal}
                        {linha.quantidade}
                      </td>
                      <td className="px-4 py-3 text-epi-muted">{linha.obra}</td>
                      <td className="px-4 py-3 text-epi-muted">{linha.responsavel}</td>
                    </tr>
                  ))}
                {!carregandoHistorico && historicoFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                      Nenhuma movimentação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!carregandoHistorico && (
            <Paginacao
              pagina={paginaHistorico}
              quantidade={historicoFiltrado.length}
              onMudar={setPaginaHistorico}
              rotulo="movimentações"
            />
          )}

          <p className="mt-3 max-w-[1060px] text-sm text-epi-muted">
            Qtd.: <b>+</b> entrou na posse (entrega), <b>±</b> troca (sai o usado, entra um novo), <b>−</b> saiu da
            posse (devolução ou baixa). Os registros não podem ser excluídos.
          </p>
        </>
      )}
    </AppShell>
  );
}
