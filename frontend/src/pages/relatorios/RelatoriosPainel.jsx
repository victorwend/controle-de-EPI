import AppShell from "../../layouts/AppShell.jsx";
import { OBRAS_RESUMO } from "../../data/obrasConfig.js";
import {
  RELATORIOS_KPIS,
  CONSUMO_POR_EPI,
  ENTREGAS_POR_OBRA,
  RELATORIOS_DISPONIVEIS,
  PERIODO_PADRAO,
} from "../../data/relatoriosConfig.js";

function exportarCsv() {
  const linhas = [
    ["Indicador", "Valor"],
    ["Entregas no período", RELATORIOS_KPIS.entregasNoPeriodo],
    ["Colaboradores atendidos", RELATORIOS_KPIS.colaboradoresAtendidos],
    ["Itens consumidos", RELATORIOS_KPIS.itensConsumidos],
    ["Pendências", RELATORIOS_KPIS.pendencias],
    [],
    ["Consumo por EPI", "Quantidade"],
    ...CONSUMO_POR_EPI.map((item) => [item.epi, item.quantidade]),
    [],
    ["Entregas por obra", "Quantidade"],
    ...ENTREGAS_POR_OBRA.map((item) => [item.obra, item.quantidade]),
  ];
  const csv = linhas.map((linha) => linha.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-epi-${PERIODO_PADRAO.inicio}-a-${PERIODO_PADRAO.fim}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosPainel() {
  return (
    <AppShell title="Relatórios" subtitle="Gere informações para gestão, auditoria e acompanhamento de EPIs." activeSection="Relatórios">
      <div className="mb-6 flex max-w-[1128px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            defaultValue={PERIODO_PADRAO.inicio}
            className="h-11 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
          />
          <input
            type="date"
            defaultValue={PERIODO_PADRAO.fim}
            className="h-11 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
          />
          <select className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand">
            <option value="">Todas as obras</option>
            {OBRAS_RESUMO.map((obra) => (
              <option key={obra.slug} value={obra.slug}>
                {obra.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={exportarCsv}
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Exportar relatório
        </button>
      </div>

      <div className="grid max-w-[1128px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Entregas no período" valor={RELATORIOS_KPIS.entregasNoPeriodo} />
        <KpiCard label="Colaboradores atendidos" valor={RELATORIOS_KPIS.colaboradoresAtendidos} />
        <KpiCard label="Itens consumidos" valor={RELATORIOS_KPIS.itensConsumidos} />
        <KpiCard label="Pendências" valor={RELATORIOS_KPIS.pendencias} />
      </div>

      <div className="mt-6 grid max-w-[1128px] grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Consumo por EPI</h3>
          <div className="mt-3 space-y-2">
            {CONSUMO_POR_EPI.map((item) => (
              <div key={item.epi} className="flex items-center justify-between text-sm">
                <span className="text-epi-ink">{item.epi}</span>
                <span className="font-medium text-epi-muted">{item.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Entregas por obra</h3>
          <div className="mt-3 space-y-2">
            {ENTREGAS_POR_OBRA.map((item) => (
              <div key={item.obra} className="flex items-center justify-between text-sm">
                <span className="text-epi-ink">{item.obra}</span>
                <span className="font-medium text-epi-muted">{item.quantidade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-[1128px] rounded-xl border border-epi-border bg-white p-6">
        <h3 className="text-sm font-semibold text-epi-ink">Relatórios disponíveis para validação</h3>
        <p className="mt-2 text-sm text-epi-ink">{RELATORIOS_DISPONIVEIS.join(" • ")}</p>
        <p className="mt-2 text-sm text-epi-muted">
          Validar com os usuários quais relatórios precisam ser impressos, exportados em Excel/PDF ou enviados ao RH/SST.
        </p>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, valor }) {
  return (
    <div className="rounded-xl border border-epi-border bg-white p-5">
      <p className="text-xs font-medium text-epi-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-epi-ink">{valor}</p>
    </div>
  );
}
