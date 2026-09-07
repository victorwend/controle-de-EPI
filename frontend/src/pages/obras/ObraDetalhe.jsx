import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { OBRAS_RESUMO, OBRA_DETALHE } from "../../data/obrasConfig.js";

export default function ObraDetalhe() {
  const { slug } = useParams();
  const resumo = OBRAS_RESUMO.find((obra) => obra.slug === slug);
  const detalhe = OBRA_DETALHE[slug];

  if (!resumo) {
    return (
      <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Obras">
        <p className="text-sm text-epi-muted">
          Obra não encontrada. <Link to="/obras" className="font-semibold text-epi-brand">Voltar para Obras</Link>
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Obras">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">{resumo.nome}</h2>
          <p className="mt-1 text-sm text-epi-muted">
            {detalhe?.subtitle ?? "Visão operacional da obra, colaboradores, estoque e pendências de EPI."}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Editar obra
        </button>
      </div>

      {detalhe ? (
        <>
          <div className="grid max-w-[1060px] grid-cols-1 gap-6 md:grid-cols-2">
            {detalhe.cards.map((card) => (
              <div key={card.title} className="rounded-xl border border-epi-border bg-white p-6">
                <h3 className="text-base font-semibold text-epi-ink">{card.title}</h3>
                {card.lines.map((line) => (
                  <p key={line} className="mt-2 text-sm text-epi-muted">
                    {line}
                  </p>
                ))}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-600">{card.highlight}</span>
                  <Link to={card.to} className="text-sm font-semibold text-epi-brand">
                    {card.linkLabel} →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
            <h3 className="text-base font-semibold text-epi-ink">Ações da obra</h3>
            <p className="mt-3 text-sm text-epi-muted">{detalhe.acoes}</p>
            <p className="mt-2 text-sm text-epi-muted">{detalhe.acoesNota}</p>
          </div>
        </>
      ) : (
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          <p>
            O detalhamento operacional completo desta obra ainda não foi desenhado no protótipo — só{" "}
            <strong>BR-040 — João Pinheiro</strong> tem essa tela pronta.
          </p>
          <p className="mt-2">
            {resumo.funcionarios === null ? "—" : `${resumo.funcionarios} funcionários`} · {resumo.episEstoque} EPIs em
            estoque · {resumo.pendencia}
          </p>
        </div>
      )}
    </AppShell>
  );
}
