import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

const FILTROS = ["Todos", "Entregas", "Trocas", "Devoluções"];

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function HistoricoCompleto() {
  const { matricula } = useParams();
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("Todos");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: funcionarioData } = await supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, obras(nome)")
        .eq("matricula", matricula)
        .maybeSingle();

      if (!ativo) return;
      setFuncionario(funcionarioData ?? null);

      if (funcionarioData) {
        const { data: itensData } = await supabase
          .from("entrega_itens")
          .select("id, quantidade, epis(nome, ca), entregas!inner(funcionario_id, created_at, usuarios(nome_completo))")
          .eq("entregas.funcionario_id", funcionarioData.id)
          .order("id", { ascending: false });
        if (ativo) setHistorico(itensData ?? []);
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [matricula]);

  const historicoFiltrado = useMemo(() => {
    // Só existe entrega real por enquanto — Trocas/Devoluções ficam
    // honestamente vazias até esses módulos serem migrados do mock.
    if (filtro === "Trocas" || filtro === "Devoluções") return [];
    return historico;
  }, [historico, filtro]);

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
    <AppShell title="Histórico completo do funcionário" subtitle="Consulte entregas, trocas, devoluções e confirmações em uma única tela." activeSection="Funcionários">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-epi-muted">Funcionário selecionado</p>
            <p className="mt-1 text-base font-semibold text-epi-ink">
              {funcionario.funcao || "—"} • {funcionario.obras?.nome ?? "—"} • Matrícula {funcionario.matricula}
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-lg font-semibold text-epi-brand">{historico.length} EPIs ativos</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-epi-brand">0 pendências</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex max-w-[1060px] flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtro === f ? "bg-[#EBF5F0] text-epi-brand" : "border border-epi-border text-epi-ink"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="rounded-lg border border-epi-border px-3 py-1.5 text-sm text-epi-muted">Últimos 90 dias</span>
      </div>

      <div className="mt-4 max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Movimentação</th>
              <th className="px-4 py-3 font-medium">EPI / CA</th>
              <th className="px-4 py-3 font-medium">Qtd.</th>
              <th className="px-4 py-3 font-medium">Confirmação</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {historicoFiltrado.map((item) => (
              <tr key={item.id} className="border-b border-epi-border last:border-0">
                <td className="px-4 py-3 text-epi-muted">{formatarData(item.entregas.created_at)}</td>
                <td className="px-4 py-3 font-medium text-epi-ink">Entrega</td>
                <td className="px-4 py-3 text-epi-muted">
                  {item.epis?.nome ?? "—"} • CA {item.epis?.ca ?? "—"}
                </td>
                <td className="px-4 py-3 text-epi-muted">{item.quantidade}</td>
                <td className="px-4 py-3 text-epi-muted">Biometria</td>
                <td className="px-4 py-3 text-epi-muted">{item.entregas.usuarios?.nome_completo ?? "—"}</td>
              </tr>
            ))}
            {historicoFiltrado.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-epi-muted">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 max-w-[1060px]">
        <Link to={`/funcionarios/${funcionario.matricula}`} className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink">
          Voltar à ficha
        </Link>
      </div>
    </AppShell>
  );
}
