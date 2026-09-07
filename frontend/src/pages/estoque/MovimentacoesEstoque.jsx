import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import EstoqueVazio from "../../components/EstoqueVazio.jsx";
import { MOVIMENTACOES, MOVIMENTACOES_KPIS } from "../../data/estoqueConfig.js";

export default function MovimentacoesEstoque() {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");

  const movimentacoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return MOVIMENTACOES.filter((mov) => {
      const bateBusca =
        !termo ||
        mov.epi.toLowerCase().includes(termo) ||
        mov.documento.toLowerCase().includes(termo) ||
        mov.responsavel.toLowerCase().includes(termo);
      const bateTipo = !tipoFiltro || mov.tipo === tipoFiltro;
      return bateBusca && bateTipo;
    });
  }, [busca, tipoFiltro]);

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
            Consulte todas as entradas, saídas, entregas, devoluções, ajustes e transferências.
          </p>
        </div>
        <Link
          to="/estoque/entrada"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Nova movimentação
        </Link>
      </div>

      <div className="mb-6 grid max-w-[1060px] grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Movimentações no mês" value={MOVIMENTACOES_KPIS.noMes} />
        <KpiCard label="Entradas" value={MOVIMENTACOES_KPIS.entradas} />
        <KpiCard label="Saídas" value={MOVIMENTACOES_KPIS.saidas} />
        <KpiCard label="Ajustes" value={MOVIMENTACOES_KPIS.ajustes} />
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
          <option value="Entrada">Entrada</option>
          <option value="Saída">Saída</option>
        </select>
      </div>

      <div className="max-w-[1060px]">
        {movimentacoesFiltradas.length === 0 ? (
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
                {movimentacoesFiltradas.map((mov, index) => (
                  <tr key={`${mov.ca}-${index}`} className="border-b border-epi-border last:border-0">
                    <td className="px-4 py-3 text-epi-muted">{mov.data}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.tipo}</td>
                    <td className="px-4 py-3 text-epi-ink">
                      {mov.epi} • CA {mov.ca}
                    </td>
                    <td className="px-4 py-3 text-epi-muted">{mov.qtd}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.origemDestino}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.responsavel}</td>
                    <td className="px-4 py-3 text-epi-muted">{mov.documento}</td>
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

function KpiCard({ label, value }) {
  return (
    <div className="rounded-xl border border-epi-border bg-white p-4">
      <p className="text-sm text-epi-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-epi-ink">{value}</p>
    </div>
  );
}
