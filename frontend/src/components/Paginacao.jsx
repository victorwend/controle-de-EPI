import { faixaMostrada, paginasVisiveis, paginaValida, totalPaginas, ITENS_POR_PAGINA } from "../lib/paginacao.js";

// Índice de páginas "‹ Anterior 1 2 3 … 10 Próxima ›" (EPI-348).
// Some quando tudo cabe numa página só.
export default function Paginacao({ pagina, quantidade, onMudar, porPagina = ITENS_POR_PAGINA, rotulo = "itens" }) {
  const total = totalPaginas(quantidade, porPagina);
  const atual = paginaValida(pagina, quantidade, porPagina);

  const botao = "h-9 min-w-9 rounded-lg px-3 text-sm font-medium disabled:opacity-40";

  return (
    <div className="mt-4 flex max-w-[1060px] flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-epi-muted">
        {faixaMostrada(atual, quantidade, porPagina)} {quantidade ? rotulo : ""}
      </p>
      {total > 1 && (
        <nav className="flex flex-wrap items-center gap-1" aria-label="Páginas">
          <button
            type="button"
            onClick={() => onMudar(atual - 1)}
            disabled={atual === 1}
            className={`${botao} border border-epi-border bg-white text-epi-ink`}
          >
            ‹ Anterior
          </button>
          {paginasVisiveis(atual, total).map((n, i) =>
            n === "…" ? (
              <span key={`r${i}`} className="px-2 text-sm text-epi-muted">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onMudar(n)}
                aria-current={n === atual ? "page" : undefined}
                className={`${botao} ${
                  n === atual ? "bg-epi-brand text-white" : "border border-epi-border bg-white text-epi-ink hover:bg-epi-paper"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onMudar(atual + 1)}
            disabled={atual === total}
            className={`${botao} border border-epi-border bg-white text-epi-ink`}
          >
            Próxima ›
          </button>
        </nav>
      )}
    </div>
  );
}
