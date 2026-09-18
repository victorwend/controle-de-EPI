import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function FichaFuncionario() {
  const { matricula } = useParams();
  const [funcionario, setFuncionario] = useState(undefined);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("funcionarios")
      .select("id, matricula, nome, funcao, status, obras(nome)")
      .eq("matricula", matricula)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setFuncionario(data ?? null);
      });
    return () => {
      ativo = false;
    };
  }, [matricula]);

  if (funcionario === undefined) {
    return (
      <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
        <p className="text-sm text-epi-muted">Carregando...</p>
      </AppShell>
    );
  }

  if (!funcionario) {
    return (
      <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          <h2 className="text-base font-semibold text-epi-ink">Funcionário não encontrado</h2>
          <p className="mt-2">Nenhum funcionário com matrícula {matricula}.</p>
          <Link to="/funcionarios" className="mt-3 inline-block font-semibold text-epi-brand">
            ← Voltar para Funcionários
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">{funcionario.nome}</h2>
          <p className="mt-1 text-sm text-epi-muted">
            Matrícula {funcionario.matricula} • {funcionario.funcao || "—"} • {funcionario.obras?.nome ?? "—"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled
            title="Ainda não implementado — ver Sprint 5 (04.05) no plano de produção"
            className="cursor-not-allowed rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-muted opacity-60"
          >
            Transferir funcionário
          </button>
          <Link
            to={`/funcionarios/${funcionario.matricula}/historico`}
            className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Histórico completo
          </Link>
          <Link to="/entregas/nova" className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            + Registrar entrega
          </Link>
        </div>
      </div>

      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
          <Stat label="EPIs ativos" valor={0} />
          <Stat label="Última entrega" valor="—" />
          <Stat label="Pendências" valor={0} />
          <Stat label="Obra" valor={funcionario.obras?.nome ?? "—"} />
          <Stat label="Status" valor={funcionario.status === "ativo" ? "Ativo" : "Inativo"} destaque />
        </div>
      </div>

      <div className="mt-6 grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Histórico de entregas</h3>
          <p className="mt-3 text-sm text-epi-muted">
            Nenhuma entrega registrada — o módulo de Entregas ainda não foi migrado do mock.
          </p>
        </div>

        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Ficha de EPI</h3>
          <p className="mt-3 text-xs uppercase text-epi-muted">Última atualização</p>
          <p className="text-sm text-epi-ink">—</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Assinatura/aceite</p>
          <p className="text-sm font-medium text-epi-brand">—</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Alertas</p>
          <p className="text-sm text-epi-muted">Nenhuma pendência encontrada.</p>
          <Link
            to={`/funcionarios/${funcionario.matricula}/ficha-epi`}
            className="mt-4 inline-block rounded-lg border border-epi-border px-4 py-2 text-sm font-medium text-epi-ink"
          >
            Abrir ficha para impressão
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, valor, destaque }) {
  return (
    <div>
      <p className="text-xs font-medium text-epi-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${destaque ? "text-epi-brand" : "text-epi-ink"}`}>{valor}</p>
    </div>
  );
}
