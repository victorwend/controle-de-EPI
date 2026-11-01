import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { filtrarHistorico, FILTROS_HISTORICO, montarHistorico, SELECT_ENTREGAS, SELECT_TROCAS } from "../../lib/historicoEpi.js";

// EPI-342: entregas, trocas, devoluções e baixas reais (antes Trocas e
// Devoluções ficavam vazias).

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function HistoricoCompleto() {
  const { matricula } = useParams();
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [emPosse, setEmPosse] = useState(0);

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
        const [{ data: itensData }, { data: trocasData }, { data: posseData }] = await Promise.all([
          supabase.from("entrega_itens").select(SELECT_ENTREGAS).eq("entregas.funcionario_id", funcionarioData.id),
          supabase.from("trocas_devolucoes_itens").select(SELECT_TROCAS).eq("funcionario_id", funcionarioData.id),
          supabase.from("posse_epi_funcionario").select("quantidade").eq("funcionario_id", funcionarioData.id),
        ]);
        if (ativo) {
          setHistorico(montarHistorico(itensData, trocasData));
          setEmPosse((posseData ?? []).reduce((total, linha) => total + (linha.quantidade ?? 0), 0));
        }
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [matricula]);

  const historicoFiltrado = useMemo(() => filtrarHistorico(historico, filtro), [historico, filtro]);

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
              <p className="text-lg font-semibold text-epi-brand">{emPosse} EPI(s) em posse</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-epi-brand">{historico.length} movimentações</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex max-w-[1060px] flex-wrap gap-2">
        {FILTROS_HISTORICO.map((f) => (
          <button
            key={f.valor || "todos"}
            type="button"
            onClick={() => setFiltro(f.valor)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filtro === f.valor ? "bg-[#EBF5F0] text-epi-brand" : "border border-epi-border text-epi-ink"
            }`}
          >
            {f.label} ({filtrarHistorico(historico, f.valor).length})
          </button>
        ))}
      </div>

      <div className="mt-4 max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Movimentação</th>
              <th className="px-4 py-3 font-medium">EPI / CA</th>
              <th className="px-4 py-3 font-medium">Qtd.</th>
              <th className="px-4 py-3 font-medium">Obra</th>
              <th className="px-4 py-3 font-medium">Confirmação / observação</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {historicoFiltrado.map((linha) => (
              <tr key={linha.id} className="border-b border-epi-border last:border-0">
                <td className="px-4 py-3 text-epi-muted">{formatarData(linha.data)}</td>
                <td className="px-4 py-3 text-epi-ink">
                  <span className="font-medium">{linha.tipo}</span>
                  <span className="block text-xs text-epi-muted">{linha.detalhe}</span>
                </td>
                <td className="px-4 py-3 text-epi-muted">
                  {linha.epi} • CA {linha.ca || "—"}
                </td>
                <td className="px-4 py-3 text-epi-muted">
                  {linha.sinal}
                  {linha.quantidade}
                </td>
                <td className="px-4 py-3 text-epi-muted">{linha.obra}</td>
                <td className="px-4 py-3 text-epi-muted">{linha.aceite || linha.observacao || "—"}</td>
                <td className="px-4 py-3 text-epi-muted">{linha.responsavel}</td>
              </tr>
            ))}
            {historicoFiltrado.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
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
