import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { ENTREGAS, TOTAL_ENTREGAS_MES } from "../../data/entregasConfig.js";
import { OBRAS_RESUMO } from "../../data/obrasConfig.js";

export default function EntregasLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");

  const entregasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ENTREGAS.filter((entrega) => {
      const bateBusca =
        !termo || entrega.funcionario.toLowerCase().includes(termo) || entrega.epi.toLowerCase().includes(termo);
      const bateObra = !obraFiltro || entrega.obra === obraFiltro;
      return bateBusca && bateObra;
    });
  }, [busca, obraFiltro]);

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Entregas de EPI">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Entregas de EPI</h2>
          <p className="mt-1 text-sm text-epi-muted">Consulte e registre todas as entregas realizadas aos colaboradores.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/entregas/troca-devolucao"
            className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Troca / devolução
          </Link>
          <Link
            to="/entregas/lote"
            className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Entrega em lote
          </Link>
          <Link
            to="/entregas/nova"
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Nova entrega
          </Link>
        </div>
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar funcionário ou EPI..."
          className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
        />
        <select
          value={obraFiltro}
          onChange={(event) => setObraFiltro(event.target.value)}
          className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
        >
          <option value="">Todas as obras</option>
          {OBRAS_RESUMO.map((obra) => (
            <option key={obra.slug} value={obra.nome.split(" — ")[0]}>
              {obra.nome}
            </option>
          ))}
        </select>
        <select className="h-11 w-44 rounded-lg border border-epi-border px-3 text-sm text-epi-ink" defaultValue="30">
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">EPI</th>
              <th className="px-4 py-3 font-medium">CA</th>
              <th className="px-4 py-3 font-medium">Obra</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Qtd.</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entregasFiltradas.map((entrega, index) => (
              <tr key={`${entrega.matricula}-${index}`} className="border-b border-epi-border last:border-0">
                <td className="px-4 py-3 font-medium text-epi-ink">{entrega.funcionario}</td>
                <td className="px-4 py-3 text-epi-muted">{entrega.epi}</td>
                <td className="px-4 py-3 text-epi-muted">{entrega.ca}</td>
                <td className="px-4 py-3 text-epi-muted">{entrega.obra}</td>
                <td className="px-4 py-3 text-epi-muted">{entrega.data}</td>
                <td className="px-4 py-3 text-epi-muted">{entrega.qtd}</td>
                <td className={`px-4 py-3 font-medium ${entrega.status === "Pendente" ? "text-orange-600" : "text-epi-muted"}`}>
                  {entrega.status}
                </td>
              </tr>
            ))}
            {entregasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Nenhuma entrega encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Mostrando 1-{entregasFiltradas.length} de {TOTAL_ENTREGAS_MES} entregas.
      </p>
      <p className="mt-1 max-w-[1060px] text-sm text-epi-muted">
        Validação automática de estoque: a entrega é bloqueada quando não houver quantidade suficiente.
      </p>
    </AppShell>
  );
}
