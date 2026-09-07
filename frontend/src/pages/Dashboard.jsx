import { Link } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import { DASHBOARD_KPIS, DASHBOARD_ALERTAS } from "../data/dashboardConfig.js";
import { ENTREGAS } from "../data/entregasConfig.js";

const AÇÕES_RÁPIDAS = [
  { label: "Registrar entrega", to: "/entregas/nova" },
  { label: "Cadastrar funcionário", to: "/funcionarios/novo" },
  { label: "Entrada de estoque", to: "/estoque/entrada" },
  { label: "Gerar relatório", to: "/relatorios" },
];

export default function Dashboard() {
  return (
    <AppShell title="Visão geral" subtitle="Acompanhe entregas, estoque, vencimentos e conformidade dos EPIs." activeSection="Visão geral">
      <div className="mb-6 flex justify-end">
        <Link to="/entregas/nova" className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          + Nova entrega
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="EPIs em estoque" valor={DASHBOARD_KPIS.episEmEstoque.valor.toLocaleString("pt-BR")} nota={DASHBOARD_KPIS.episEmEstoque.nota} />
        <KpiCard label="Entregas no mês" valor={DASHBOARD_KPIS.entregasNoMes.valor} nota={DASHBOARD_KPIS.entregasNoMes.nota} />
        <KpiCard label="Estoque crítico" valor={DASHBOARD_KPIS.estoqueCritico.valor} nota={DASHBOARD_KPIS.estoqueCritico.nota} />
        <KpiCard label="CAs a vencer" valor={DASHBOARD_KPIS.casAVencer.valor} nota={DASHBOARD_KPIS.casAVencer.nota} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-epi-ink">Movimentações recentes</h3>
            <Link to="/entregas" className="text-sm font-medium text-epi-brand">
              Ver todas
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                  <th className="py-2 pr-4 font-medium">Funcionário</th>
                  <th className="py-2 pr-4 font-medium">EPI</th>
                  <th className="py-2 pr-4 font-medium">Obra</th>
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 font-medium">Qtd.</th>
                </tr>
              </thead>
              <tbody>
                {ENTREGAS.map((entrega, index) => (
                  <tr key={`${entrega.matricula}-${index}`} className="border-b border-epi-border text-epi-ink last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{entrega.funcionario}</td>
                    <td className="py-2.5 pr-4 text-epi-muted">{entrega.epi}</td>
                    <td className="py-2.5 pr-4 text-epi-muted">{entrega.obra}</td>
                    <td className="py-2.5 pr-4 text-epi-muted">{entrega.data}</td>
                    <td className="py-2.5 text-epi-muted">{entrega.qtd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Alertas e pendências</h3>
          <div className="mt-4 space-y-4">
            {DASHBOARD_ALERTAS.map((alerta) => (
              <div key={alerta.titulo} className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alerta.cor === "laranja" ? "bg-orange-500" : "bg-epi-brand"}`} />
                <div>
                  <p className="text-sm font-medium text-epi-ink">{alerta.titulo}</p>
                  <p className="text-xs text-epi-muted">{alerta.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-epi-border bg-white p-6">
        <h3 className="text-sm font-semibold text-epi-ink">Ações rápidas</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AÇÕES_RÁPIDAS.map((acao) => (
            <Link
              key={acao.to}
              to={acao.to}
              className="rounded-lg bg-[#EBF5F0] px-4 py-2.5 text-center text-sm font-medium text-epi-brand hover:opacity-90"
            >
              {acao.label}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ label, valor, nota }) {
  return (
    <div className="rounded-xl border border-epi-border bg-white p-5">
      <p className="text-xs font-medium text-epi-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-epi-ink">{valor}</p>
      <p className="mt-1 text-xs text-epi-muted">{nota}</p>
    </div>
  );
}
