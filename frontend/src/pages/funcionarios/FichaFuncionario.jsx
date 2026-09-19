import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function FichaFuncionario() {
  const { matricula } = useParams();
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: funcionarioData } = await supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, status, obras(nome)")
        .eq("matricula", matricula)
        .maybeSingle();

      if (!ativo) return;
      setFuncionario(funcionarioData ?? null);

      if (funcionarioData) {
        const { data: itensData } = await supabase
          .from("entrega_itens")
          .select("id, quantidade, epis(nome, ca), entregas!inner(funcionario_id, created_at, responsavel_usuario_id, usuarios(nome_completo))")
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

  const ultimaEntrega = historico[0]?.entregas?.created_at;

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
          <Stat label="EPIs ativos" valor={historico.length} />
          <Stat label="Última entrega" valor={ultimaEntrega ? formatarData(ultimaEntrega) : "—"} />
          <Stat label="Pendências" valor={0} />
          <Stat label="Obra" valor={funcionario.obras?.nome ?? "—"} />
          <Stat label="Status" valor={funcionario.status === "ativo" ? "Ativo" : "Inativo"} destaque />
        </div>
      </div>

      <div className="mt-6 grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Histórico de entregas</h3>
          {historico.length === 0 ? (
            <p className="mt-3 text-sm text-epi-muted">Nenhuma entrega registrada para este funcionário.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium">EPI</th>
                    <th className="py-2 pr-4 font-medium">CA</th>
                    <th className="py-2 pr-4 font-medium">Qtd.</th>
                    <th className="py-2 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item) => (
                    <tr key={item.id} className="border-b border-epi-border text-epi-ink last:border-0">
                      <td className="py-2.5 pr-4 text-epi-muted">{formatarData(item.entregas.created_at)}</td>
                      <td className="py-2.5 pr-4 font-medium">{item.epis?.nome ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-epi-muted">{item.epis?.ca ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-epi-muted">{item.quantidade}</td>
                      <td className="py-2.5 text-epi-muted">{item.entregas.usuarios?.nome_completo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Ficha de EPI</h3>
          <p className="mt-3 text-xs uppercase text-epi-muted">Última atualização</p>
          <p className="text-sm text-epi-ink">{ultimaEntrega ? formatarData(ultimaEntrega) : "—"}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Assinatura/aceite</p>
          <p className="text-sm font-medium text-epi-brand">{historico.length > 0 ? "Registrado" : "—"}</p>
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
