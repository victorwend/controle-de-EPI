import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { RELATORIOS_DISPONIVEIS } from "../../data/relatoriosConfig.js";

function paraDataInput(data) {
  return data.toISOString().slice(0, 10);
}

function periodoPadrao() {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  return { inicio: paraDataInput(inicio), fim: paraDataInput(fim) };
}

export default function RelatoriosPainel() {
  const [periodo] = useState(periodoPadrao());
  const [dataInicio, setDataInicio] = useState(periodo.inicio);
  const [dataFim, setDataFim] = useState(periodo.fim);
  const [obraFiltro, setObraFiltro] = useState("");
  const [itens, setItens] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("entrega_itens")
        .select("id, entrega_id, quantidade, epis(nome), entregas(created_at, funcionario_id, funcionarios(obra_id, obras(nome)))"),
      supabase.from("obras").select("id, nome").order("nome"),
    ]).then(([{ data: itensData }, { data: obrasData }]) => {
      if (!ativo) return;
      setItens(itensData ?? []);
      setObras(obrasData ?? []);
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const itensFiltrados = useMemo(() => {
    const inicio = new Date(`${dataInicio}T00:00:00`);
    const fim = new Date(`${dataFim}T23:59:59`);
    return itens.filter((item) => {
      const data = item.entregas?.created_at ? new Date(item.entregas.created_at) : null;
      const noPeriodo = data && data >= inicio && data <= fim;
      const obraId = item.entregas?.funcionarios?.obra_id;
      const bateObra = !obraFiltro || obraId === obraFiltro;
      return noPeriodo && bateObra;
    });
  }, [itens, dataInicio, dataFim, obraFiltro]);

  const kpis = useMemo(() => {
    const entregaIds = new Set(itensFiltrados.map((item) => item.entrega_id));
    const funcionarioIds = new Set(itensFiltrados.map((item) => item.entregas?.funcionario_id).filter(Boolean));
    const itensConsumidos = itensFiltrados.reduce((soma, item) => soma + item.quantidade, 0);
    return {
      entregasNoPeriodo: entregaIds.size,
      colaboradoresAtendidos: funcionarioIds.size,
      itensConsumidos,
      pendencias: 0,
    };
  }, [itensFiltrados]);

  const consumoPorEpi = useMemo(() => {
    const mapa = new Map();
    for (const item of itensFiltrados) {
      const nome = item.epis?.nome ?? "—";
      mapa.set(nome, (mapa.get(nome) ?? 0) + item.quantidade);
    }
    return [...mapa.entries()].map(([epi, quantidade]) => ({ epi, quantidade })).sort((a, b) => b.quantidade - a.quantidade);
  }, [itensFiltrados]);

  const entregasPorObra = useMemo(() => {
    const mapa = new Map();
    for (const item of itensFiltrados) {
      const nome = item.entregas?.funcionarios?.obras?.nome ?? "—";
      if (!mapa.has(nome)) mapa.set(nome, new Set());
      mapa.get(nome).add(item.entrega_id);
    }
    return [...mapa.entries()]
      .map(([obra, entregaIds]) => ({ obra, quantidade: entregaIds.size }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [itensFiltrados]);

  function exportarCsv() {
    const linhas = [
      ["Indicador", "Valor"],
      ["Entregas no período", kpis.entregasNoPeriodo],
      ["Colaboradores atendidos", kpis.colaboradoresAtendidos],
      ["Itens consumidos", kpis.itensConsumidos],
      ["Pendências", kpis.pendencias],
      [],
      ["Consumo por EPI", "Quantidade"],
      ...consumoPorEpi.map((item) => [item.epi, item.quantidade]),
      [],
      ["Entregas por obra", "Quantidade"],
      ...entregasPorObra.map((item) => [item.obra, item.quantidade]),
    ];
    const csv = linhas.map((linha) => linha.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-epi-${dataInicio}-a-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Relatórios" subtitle="Gere informações para gestão, auditoria e acompanhamento de EPIs." activeSection="Relatórios">
      <div className="mb-6 flex max-w-[1128px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={dataInicio}
            onChange={(event) => setDataInicio(event.target.value)}
            className="h-11 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
            className="h-11 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
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
        <button
          type="button"
          onClick={exportarCsv}
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Exportar relatório
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-epi-muted">Carregando...</p>
      ) : (
        <>
          <div className="grid max-w-[1128px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Entregas no período" valor={kpis.entregasNoPeriodo} />
            <KpiCard label="Colaboradores atendidos" valor={kpis.colaboradoresAtendidos} />
            <KpiCard label="Itens consumidos" valor={kpis.itensConsumidos} />
            <KpiCard label="Pendências" valor={kpis.pendencias} nota="Sem conceito de pendência implementado ainda." />
          </div>

          <div className="mt-6 grid max-w-[1128px] grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-epi-border bg-white p-6">
              <h3 className="text-sm font-semibold text-epi-ink">Consumo por EPI</h3>
              <div className="mt-3 space-y-2">
                {consumoPorEpi.length === 0 ? (
                  <p className="text-sm text-epi-muted">Nenhuma entrega no período selecionado.</p>
                ) : (
                  consumoPorEpi.map((item) => (
                    <div key={item.epi} className="flex items-center justify-between text-sm">
                      <span className="text-epi-ink">{item.epi}</span>
                      <span className="font-medium text-epi-muted">{item.quantidade}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border border-epi-border bg-white p-6">
              <h3 className="text-sm font-semibold text-epi-ink">Entregas por obra</h3>
              <div className="mt-3 space-y-2">
                {entregasPorObra.length === 0 ? (
                  <p className="text-sm text-epi-muted">Nenhuma entrega no período selecionado.</p>
                ) : (
                  entregasPorObra.map((item) => (
                    <div key={item.obra} className="flex items-center justify-between text-sm">
                      <span className="text-epi-ink">{item.obra}</span>
                      <span className="font-medium text-epi-muted">{item.quantidade}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

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

function KpiCard({ label, valor, nota }) {
  return (
    <div className="rounded-xl border border-epi-border bg-white p-5">
      <p className="text-xs font-medium text-epi-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-epi-ink">{valor}</p>
      {nota && <p className="mt-1 text-xs text-epi-muted">{nota}</p>}
    </div>
  );
}
