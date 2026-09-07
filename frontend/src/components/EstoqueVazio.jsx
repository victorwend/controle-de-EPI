import { Link } from "react-router-dom";

export default function EstoqueVazio({ onLimparFiltros }) {
  return (
    <div className="rounded-xl bg-epi-paper p-10 text-center">
      <h3 className="text-lg font-semibold text-epi-ink">Nenhum EPI encontrado</h3>
      <p className="mt-1 text-sm text-epi-muted">Não existem itens neste local ou os filtros atuais não retornaram resultados.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={onLimparFiltros}
          className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
        >
          Limpar filtros
        </button>
        <Link
          to="/estoque/entrada"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Registrar entrada
        </Link>
      </div>
    </div>
  );
}
