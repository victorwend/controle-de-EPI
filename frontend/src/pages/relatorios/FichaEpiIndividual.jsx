import { Link, useParams } from "react-router-dom";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { FICHA_HISTORICO_POR_FUNCIONARIO } from "../../data/entregasConfig.js";

// Tela 08.02 — Relatórios — Ficha individual de EPI. Documento de impressão/PDF,
// por isso não usa o AppShell (menu lateral fixo não faz sentido numa folha
// impressa) — layout próprio, com a barra de ações escondida no print via
// print:hidden.
//
// Correção em relação ao Figma: as seções "EPIs entregues ao colaborador" e
// "Termo de responsabilidade" reaproveitavam literalmente os números agregados
// de TODOS os funcionários vindos do painel de Relatórios (08.01) — mesmos
// valores de "Consumo por EPI" e "Entregas por obra", que não fazem sentido
// como ficha de UM colaborador. Aqui usam o histórico real do próprio
// funcionário (mesma fonte da Ficha, 04.03) — mesmo tipo de copiar-colar já
// corrigido em sessões anteriores (ver README, Sprint 7).
export default function FichaEpiIndividual() {
  const { matricula } = useParams();
  const funcionario = FUNCIONARIOS.find((f) => f.matricula === matricula);
  const historico = funcionario ? FICHA_HISTORICO_POR_FUNCIONARIO[funcionario.matricula] ?? [] : [];
  const ultimoResponsavel = historico[0]?.responsavel;

  if (!funcionario) {
    return (
      <div className="mx-auto max-w-[900px] p-10 text-sm text-epi-muted">
        <p>Funcionário não encontrado.</p>
        <Link to="/funcionarios" className="mt-3 inline-block font-semibold text-epi-brand">
          ← Voltar para Funcionários
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-epi-paper">
      <div className="print:hidden mx-auto flex max-w-[900px] items-center justify-between px-6 py-6">
        <Link to={`/funcionarios/${funcionario.matricula}`} className="text-sm font-medium text-epi-ink">
          ← Voltar à ficha
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Exportar PDF / Imprimir
        </button>
      </div>

      <div className="mx-auto max-w-[900px] rounded-xl border border-epi-border bg-white p-8 print:border-0 print:shadow-none">
        <h1 className="text-2xl font-semibold text-epi-ink">Ficha individual de EPI</h1>
        <p className="mt-1 text-sm text-epi-muted">Documento individual do colaborador para impressão, PDF e auditoria.</p>

        <div className="mt-4 rounded-lg border border-epi-border px-4 py-3 text-sm">
          <span className="font-semibold text-epi-ink">
            {funcionario.nome} • Matrícula {funcionario.matricula}
          </span>
          <span className="ml-3 text-epi-muted">{funcionario.obra}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Função" valor={funcionario.funcao} />
          <Stat label="Status" valor={funcionario.status} />
          <Stat label="EPIs ativos" valor={funcionario.episAtivos} />
          <Stat label="Última atualização" valor={funcionario.ultimaEntrega ?? "—"} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-epi-border p-5">
            <h3 className="text-sm font-semibold text-epi-ink">EPIs entregues ao colaborador</h3>
            {historico.length === 0 ? (
              <p className="mt-3 text-sm text-epi-muted">Nenhuma entrega registrada.</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm">
                {historico.map((item) => (
                  <div key={item.ca} className="flex items-center justify-between">
                    <span className="text-epi-ink">{item.epi}</span>
                    <span className="text-epi-muted">{item.qtd} un.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-epi-border p-5">
            <h3 className="text-sm font-semibold text-epi-ink">Termo de responsabilidade</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-epi-ink">Assinatura/biometria</span>
                <span className="font-medium text-epi-brand">{historico.length > 0 ? "Registrado" : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-epi-ink">Data do aceite</span>
                <span className="text-epi-muted">{funcionario.ultimaEntrega ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-epi-ink">Responsável pela entrega</span>
                <span className="text-epi-muted">{ultimoResponsavel ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-epi-border p-5">
          <h3 className="text-sm font-semibold text-epi-ink">Declaração do colaborador</h3>
          <p className="mt-2 text-sm text-epi-ink">
            Declaro ter recebido os equipamentos relacionados, orientações de uso, conservação e responsabilidade.
          </p>
          <p className="mt-2 text-xs text-epi-muted">Assinatura/biometria • Data do aceite • Responsável pela entrega • Histórico auditável</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor }) {
  return (
    <div>
      <p className="text-xs font-medium text-epi-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-epi-ink">{valor}</p>
    </div>
  );
}
