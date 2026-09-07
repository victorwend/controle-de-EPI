import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { FICHA_HISTORICO_POR_FUNCIONARIO } from "../../data/entregasConfig.js";

export default function FichaFuncionario() {
  const { matricula } = useParams();
  const funcionario = FUNCIONARIOS.find((f) => f.matricula === matricula);
  const historico = funcionario ? FICHA_HISTORICO_POR_FUNCIONARIO[funcionario.matricula] ?? [] : [];

  if (!funcionario) {
    return (
      <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          <h2 className="text-base font-semibold text-epi-ink">Funcionário não encontrado</h2>
          <p className="mt-2">Nenhum funcionário com matrícula {matricula} neste mock.</p>
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
            Matrícula {funcionario.matricula} • {funcionario.funcao} • {funcionario.obra}
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
          <Stat label="EPIs ativos" valor={funcionario.episAtivos} />
          <Stat label="Última entrega" valor={funcionario.ultimaEntrega ?? "—"} />
          <Stat label="Pendências" valor={funcionario.pendencias} />
          <Stat label="Obra" valor={funcionario.obra} />
          <Stat label="Status" valor={funcionario.status} destaque />
        </div>
      </div>

      <div className="mt-6 grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Histórico de entregas</h3>
          {historico.length === 0 ? (
            <p className="mt-3 text-sm text-epi-muted">Nenhuma entrega registrada para este funcionário neste mock.</p>
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
                  {historico.map((item, index) => (
                    <tr key={index} className="border-b border-epi-border text-epi-ink last:border-0">
                      <td className="py-2.5 pr-4 text-epi-muted">{item.data}</td>
                      <td className="py-2.5 pr-4 font-medium">{item.epi}</td>
                      <td className="py-2.5 pr-4 text-epi-muted">{item.ca}</td>
                      <td className="py-2.5 pr-4 text-epi-muted">{item.qtd}</td>
                      <td className="py-2.5 text-epi-muted">{item.responsavel}</td>
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
          <p className="text-sm text-epi-ink">{funcionario.ultimaEntrega ?? "—"}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Assinatura/aceite</p>
          <p className="text-sm font-medium text-epi-brand">{historico.length > 0 ? "Registrado" : "—"}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Alertas</p>
          <p className="text-sm text-epi-muted">
            {funcionario.pendencias > 0 ? `${funcionario.pendencias} pendência(s) encontrada(s).` : "Nenhuma pendência encontrada."}
          </p>
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
