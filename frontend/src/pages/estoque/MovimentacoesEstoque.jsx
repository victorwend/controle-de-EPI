import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import EstoqueVazio from "../../components/EstoqueVazio.jsx";
import { supabase } from "../../lib/supabaseClient";

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

function origemDestino(mov) {
  if (mov.tipo === "entrada") {
    return `${mov.fornecedor || "Fornecedor"} → ${mov.destino?.nome ?? "—"}`;
  }
  if (mov.tipo === "saida") {
    return `${mov.origem?.nome ?? "—"} → Entrega`;
  }
  return `${mov.origem?.nome ?? "—"} → ${mov.destino?.nome ?? "—"}`;
}

function labelTipo(tipo) {
  if (tipo === "entrada") return "Entrada";
  if (tipo === "saida") return "Saída";
  return "Transferência";
}

export default function MovimentacoesEstoque() {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("movimentacoes_estoque")
      .select(
        "id, tipo, quantidade, documento, fornecedor, created_at, epis(nome, ca), origem:local_origem_id(nome), destino:local_destino_id(nome), usuarios(nome_completo)"
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!ativo) return;
        setMovimentacoes(data ?? []);
        setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const hoje = new Date();
    const doMes = movimentacoes.filter((mov) => {
      const data = new Date(mov.created_at);
      return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    });
    return {
      noMes: doMes.length,
      entradas: doMes.filter((mov) => mov.tipo === "entrada").length,
      saidas: doMes.filter((mov) => mov.tipo === "saida").length,
      transferencias: doMes.filter((mov) => mov.tipo === "transferencia").length,
    };
  }, [movimentacoes]);

  const movimentacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return movimentacoes.filter((mov) => {
      const bateBusca =
        !termo ||
        (mov.epis?.nome ?? "").toLowerCase().includes(termo) ||
        (mov.documento ?? "").toLowerCase().includes(termo) ||
        (mov.usuarios?.nome_completo ?? "").toLowerCase().includes(termo);
      const bateTipo = !tipoFiltro || mov.tipo === tipoFiltro;
      return bateBusca && bateTipo;
    });
  }, [busca, tipoFiltro, movimentacoes]);

  function limparFiltros() {
    setBusca("");
    setTipoFiltro("");
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Estoque">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Movimentações de estoque</h2>
          <p className="mt-1 text-sm text-epi-muted">
            Consulte todas as entradas e transferências registradas.
          </p>
        </div>
        <Link
          to="/estoque/entrada"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Nova movimentação
        </Link>
      </div>

      <div className="mb-6 grid max-w-[1060px] grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Movimentações no mês" value={kpis.noMes} />
        <KpiCard label="Entradas" value={kpis.entradas} />
        <KpiCard label="Saídas" value={kpis.saidas} />
        <KpiCard label="Transferências" value={kpis.transferencias} />
        <KpiCard label="Ajustes" value={0} nota="Ajuste manual ainda não implementado." />
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar EPI, documento ou responsável..."
          className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
        />
        <select
          value={tipoFiltro}
          onChange={(event) => setTipoFiltro(event.target.value)}
          className="h-11 w-44 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
        >
          <option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
          <option value="transferencia">Transferência</option>
        </select>
      </div>

      <div className="max-w-[1060px]">
        {loading ? (
          <p className="py-6 text-center text-sm text-epi-muted">Carregando...</p>
        ) : movimentacoesFiltradas.length === 0 ? (
          <EstoqueVazio onLimparFiltros={limparFiltros} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-epi-border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">EPI / CA</th>
                  <th className="px-4 py-3 font-medium">Qtd.</th>
                  <th className="px-4 py-3 font-medium">Origem / destino</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.map((mov) => (
                  <tr key={mov.id} className="border-b border-epi-border last:border-0">
                    <td className="px-4 py-3 text-epi-muted">{formatarData(mov.created_at)}</td>
                    <td className="px-4 py-3 text-epi-muted">
                      {labelTipo(mov.tipo)}
                    </td>
                    <td className="px-4 py-3 text-epi-ink">
                      {mov.epis?.nome ?? "—"} • CA {mov.epis?.ca ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-epi-muted">{mov.quantidade}</td>
                    <td className="px-4 py-3 text-epi-muted">{origemDestino(mov)}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.usuarios?.nome_completo ?? "—"}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.documento || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({ label, value, nota }) {
  return (
    <div className="rounded-xl border border-epi-border bg-white p-4">
      <p className="text-sm text-epi-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-epi-ink">{value}</p>
      {nota && <p className="mt-1 text-xs text-epi-muted">{nota}</p>}
    </div>
  );
}
