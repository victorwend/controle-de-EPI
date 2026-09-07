import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { OBRAS_RESUMO } from "../../data/obrasConfig.js";

export default function ObrasLista() {
  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Obras">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Obras e locais</h2>
          <p className="mt-1 text-sm text-epi-muted">
            Organize colaboradores, estoques e movimentações por obra.
          </p>
        </div>
        <Link
          to="/cadastros/obra"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Nova obra
        </Link>
      </div>

      <div className="grid max-w-[1060px] grid-cols-1 gap-6 md:grid-cols-2">
        {OBRAS_RESUMO.map((obra) => (
          <div key={obra.slug} className="rounded-xl border border-epi-border bg-white p-6">
            <h3 className="text-base font-semibold text-epi-ink">{obra.nome}</h3>
            <p className="mt-2 text-sm text-epi-muted">
              {obra.funcionarios === null ? "—" : `${obra.funcionarios} funcionários`}
            </p>
            <p className="text-sm text-epi-muted">{obra.episEstoque} EPIs em estoque</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-orange-600">{obra.pendencia}</span>
              <Link to={`/obras/${obra.slug}`} className="text-sm font-semibold text-epi-brand">
                Ver detalhes →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
        <h3 className="text-base font-semibold text-epi-ink">Resumo operacional</h3>
        <p className="mt-3 text-sm text-epi-muted">
          Use esta visão para validar se o estoque deve ser separado por obra, almoxarifado ou ambos.
        </p>
        <p className="mt-2 text-sm text-epi-muted">
          Também validar: transferência de funcionário entre obras e transferência de saldo entre estoques.
        </p>
      </div>
    </AppShell>
  );
}
