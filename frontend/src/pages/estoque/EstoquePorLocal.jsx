import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import EstoqueVazio from "../../components/EstoqueVazio.jsx";
import { LOCAIS_ESTOQUE, SALDO_POR_EPI } from "../../data/estoqueConfig.js";

// Não existe "05.01 — Estoque — Visão geral" no protótipo (lacuna já registrada em
// docs/04-ux-ui/auditoria-figma.md). Esta tela preenche essa lacuna usando o conteúdo
// real de "Estoque por local", visto no card principal do estado vazio (05.06).
export default function EstoquePorLocal() {
  const [busca, setBusca] = useState("");
  const [localFiltro, setLocalFiltro] = useState("");

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return Object.entries(SALDO_POR_EPI).filter(([nome, info]) => {
      const bateBusca = !termo || nome.toLowerCase().includes(termo);
      const bateLocal = !localFiltro || info.local === localFiltro;
      return bateBusca && bateLocal;
    });
  }, [busca, localFiltro]);

  function limparFiltros() {
    setBusca("");
    setLocalFiltro("");
  }

  return (
    <AppShell title="Estoque" subtitle="Consulte o saldo disponível por EPI e por local." activeSection="Estoque">
      <div className="mb-6 flex items-center justify-between">
        <div />
        <div className="flex gap-3">
          <Link
            to="/estoque/movimentacoes"
            className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Ver movimentações
          </Link>
          <Link
            to="/estoque/entrada"
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Registrar entrada
          </Link>
        </div>
      </div>

      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        <h2 className="text-lg font-semibold text-epi-ink">Estoque por local</h2>

        <div className="mt-4 mb-4 flex gap-3">
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar EPI..."
            className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
          />
          <select
            value={localFiltro}
            onChange={(event) => setLocalFiltro(event.target.value)}
            className="h-11 w-56 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
          >
            <option value="">Todos os locais</option>
            {LOCAIS_ESTOQUE.map((local) => (
              <option key={local} value={local}>
                {local}
              </option>
            ))}
          </select>
        </div>

        {itens.length === 0 ? (
          <EstoqueVazio onLimparFiltros={limparFiltros} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-epi-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="px-4 py-3 font-medium">EPI</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Saldo disponível</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(([nome, info]) => (
                  <tr key={nome} className="border-b border-epi-border last:border-0">
                    <td className="px-4 py-3 font-medium text-epi-ink">{nome}</td>
                    <td className="px-4 py-3 text-epi-muted">{info.local}</td>
                    <td className="px-4 py-3 text-epi-muted">{info.saldo}</td>
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
