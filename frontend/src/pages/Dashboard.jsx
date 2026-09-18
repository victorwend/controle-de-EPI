import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import { supabase } from "../lib/supabaseClient";

const AÇÕES_RÁPIDAS = [
  { label: "Registrar entrega", to: "/entregas/nova" },
  { label: "Cadastrar funcionário", to: "/funcionarios/novo" },
  { label: "Entrada de estoque", to: "/estoque/entrada" },
  { label: "Gerar relatório", to: "/relatorios" },
];

export default function Dashboard() {
  const [totalObras, setTotalObras] = useState(null);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("obras")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (ativo) setTotalObras(count ?? 0);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <AppShell title="Visão geral" subtitle="Acompanhe entregas, estoque, vencimentos e conformidade dos EPIs." activeSection="Visão geral">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-epi-muted">
          {totalObras === null ? "Carregando obras..." : `${totalObras} obra(s) cadastrada(s)`}
        </p>
        <Link to="/entregas/nova" className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          + Nova entrega
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="EPIs em estoque" valor={0} nota="Cadastro de EPIs e estoque ainda não implementado." />
        <KpiCard label="Entregas no mês" valor={0} nota="Nenhuma entrega registrada ainda." />
        <KpiCard label="Estoque crítico" valor={0} nota="Controle de estoque ainda não implementado." />
        <KpiCard label="CAs a vencer" valor={0} nota="Cadastro de EPIs e CAs ainda não implementado." />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-epi-ink">Movimentações recentes</h3>
            <Link to="/entregas" className="text-sm font-medium text-epi-brand">
              Ver todas
            </Link>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-epi-border p-6 text-center text-sm text-epi-muted">
            Nenhuma movimentação registrada ainda.
            <br />
            <Link to="/entregas/nova" className="mt-2 inline-block font-semibold text-epi-brand">
              Registrar a primeira entrega
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Alertas e pendências</h3>
          <p className="mt-4 text-sm text-epi-muted">Nenhum alerta no momento.</p>
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
