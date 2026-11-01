import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import SePuder from "../../components/SePuder.jsx";
import { filtrarFuncionarios } from "../../lib/funcionarios.js";
import { rotuloMotivoEntrega } from "../../lib/entregas.js";
import { filtrarEntregas } from "../../lib/loteEntrega.js";

// Aba Entregas de EPI: todas as entregas, da mais recente para a mais antiga.
//
// EPI-344 (pedido do Victor, 01/11/2026): a lista de funcionários com
// caixinhas que a EPI-343 colocou aqui repetia a aba Funcionários e saiu.
// Ficou só a lista de entregas + "Consultar entregas de um funcionário":
// busca o funcionário (ativo ou inativo) e a lista mostra só as entregas
// dele. Clicar no nome de alguém na lista faz o mesmo.

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function EntregasLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscaFuncionario, setBuscaFuncionario] = useState("");
  // Funcionário cujas entregas estão sendo consultadas (null = todos).
  const [consultado, setConsultado] = useState(null);

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
    () =>
      filtrarEntregas(linhas, {
        busca,
        obraId: obraFiltro,
        funcionarioIds: consultado ? new Set([consultado.id]) : null,
      }),
    [busca, obraFiltro, linhas, consultado]
  );

  function consultar(funcionario) {
    setConsultado(funcionario);
    setBuscaFuncionario("");
    setBusca("");
  }

  function consultarPorId(funcionarioId) {
    const funcionario = funcionarios.find((f) => f.id === funcionarioId);
    if (funcionario) consultar(funcionario);
  }

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

      {/* Consultar entregas de um funcionário */}
      <div className="mb-4 max-w-[1060px] rounded-xl border border-epi-border bg-white p-4">
        {!consultado ? (
          <div className="relative">
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
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-epi-border bg-white shadow-lg">
                {sugestoes.length === 0 && <p className="px-3 py-2 text-sm text-epi-muted">Nenhum funcionário encontrado.</p>}
                {sugestoes.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => consultar(f)}
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
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-epi-muted">Mostrando as entregas de</p>
              <p className="text-sm font-semibold text-epi-ink">
                {consultado.nome}
                <span className="font-normal text-epi-muted">
                  {" "}
                  • matrícula {consultado.matricula} • {consultado.obras?.nome ?? "sem obra"}
                  {consultado.status !== "ativo" && " • inativo"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link to={`/funcionarios/${consultado.matricula}/historico`} className="font-semibold text-epi-brand">
                Histórico completo (trocas e devoluções) →
              </Link>
              {consultado.status === "ativo" && (
                <SePuder acao="registrar_entregas">
                  <Link
                    to={`/entregas/nova?funcionario=${encodeURIComponent(consultado.matricula)}`}
                    className="font-semibold text-epi-brand"
                  >
                    + Nova entrega para ele
                  </Link>
                </SePuder>
              )}
              <button
                type="button"
                onClick={() => setConsultado(null)}
                className="rounded-lg border border-epi-border bg-white px-3 py-1.5 font-medium text-epi-ink"
              >
                Ver todas as entregas
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Filtrar por funcionário ou EPI..."
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
      </div>

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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => consultarPorId(linha.entregas?.funcionario_id)}
                      title="Consultar as entregas deste funcionário"
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
              ))}
            {!loading && linhasFiltradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-epi-muted">
                  {consultado ? "Este funcionário ainda não recebeu nenhum EPI." : "Nenhuma entrega encontrada."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Mostrando {linhasFiltradas.length} de {linhas.length} itens entregues. Clique no nome de um funcionário para ver
        só as entregas dele.
      </p>
      <p className="mt-1 max-w-[1060px] text-sm text-epi-muted">
        Validação automática de estoque: a entrega é bloqueada quando não houver quantidade suficiente.
      </p>
    </AppShell>
  );
}
