import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { formatarData as formatarDataCa, TEXTO_DECLARACAO } from "../../lib/termoRecebimento";
import { montarHistorico, SELECT_ENTREGAS, SELECT_TROCAS } from "../../lib/historicoEpi.js";

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

// Tela 08.02 — Relatórios — Ficha individual de EPI. Documento de impressão/PDF,
// por isso não usa o AppShell (menu lateral fixo não faz sentido numa folha
// impressa) — layout próprio, com a barra de ações escondida no print via
// print:hidden.
//
// EPI-328: segue as "regras recomendadas para confirmação de entrega de EPI"
// (31/10/2026): identificação completa do trabalhador (com empresa e setor),
// cada EPI com CA, validade do CA, quantidade e data, o método de aceite real,
// o responsável e o comprovante de cada entrega, a declaração de ciência e o
// campo de assinatura do colaborador.
export default function FichaEpiIndividual() {
  const { matricula } = useParams();
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [empresaNome, setEmpresaNome] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: funcionarioData } = await supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, setor, status, obras(nome)")
        .eq("matricula", matricula)
        .maybeSingle();

      if (!ativo) return;
      setFuncionario(funcionarioData ?? null);

      if (funcionarioData) {
        // EPI-342: entregas E trocas/devoluções/baixas, mais recente primeiro.
        const [{ data: itensData }, { data: trocasData }, { data: empresaData }] = await Promise.all([
          supabase.from("entrega_itens").select(SELECT_ENTREGAS).eq("entregas.funcionario_id", funcionarioData.id),
          supabase.from("trocas_devolucoes_itens").select(SELECT_TROCAS).eq("funcionario_id", funcionarioData.id),
          supabase.from("empresas").select("razao_social").limit(1),
        ]);
        if (!ativo) return;
        setHistorico(montarHistorico(itensData, trocasData));
        setEmpresaNome(empresaData?.[0]?.razao_social ?? "");
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [matricula]);

  if (funcionario === undefined) {
    return <div className="mx-auto max-w-[900px] p-10 text-sm text-epi-muted">Carregando...</div>;
  }

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

  const ultimaEntrega = historico.find((linha) => linha.categoria === "entrega")?.data;

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
          <span className="ml-3 text-epi-muted">{empresaNome}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-5">
          <Stat label="Função" valor={funcionario.funcao || "—"} />
          <Stat label="Setor" valor={funcionario.setor || "—"} />
          <Stat label="Obra atual" valor={funcionario.obras?.nome ?? "—"} />
          <Stat label="Status" valor={funcionario.status === "ativo" ? "Ativo" : "Inativo"} />
          <Stat label="Última entrega" valor={ultimaEntrega ? formatarData(ultimaEntrega) : "—"} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-epi-border">
          <h3 className="px-4 pt-4 text-sm font-semibold text-epi-ink">
            Movimentações de EPI do colaborador (entregas, trocas, devoluções e baixas)
          </h3>
          {historico.length === 0 ? (
            <p className="px-4 pb-4 pt-3 text-sm text-epi-muted">Nenhuma entrega registrada.</p>
          ) : (
            <table className="mt-3 w-full text-left text-xs">
              <thead className="border-y border-epi-border uppercase text-epi-muted">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Movimentação</th>
                  <th className="px-3 py-2">Obra</th>
                  <th className="px-3 py-2">EPI</th>
                  <th className="px-3 py-2">CA</th>
                  <th className="px-3 py-2">Validade do CA</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Aceite / observação</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((linha) => (
                  <tr key={linha.id} className="border-b border-epi-border last:border-0">
                    <td className="px-3 py-2 text-epi-ink">{formatarData(linha.data)}</td>
                    <td className="px-3 py-2 text-epi-ink">
                      <b>{linha.tipo}</b>
                      <span className="block text-epi-muted">{linha.detalhe}</span>
                    </td>
                    {/* EPI-339: obra em que aconteceu (o funcionário pode ter sido transferido) */}
                    <td className="px-3 py-2 text-epi-muted">{linha.obra}</td>
                    <td className="px-3 py-2 text-epi-ink">{linha.epi}</td>
                    <td className="px-3 py-2 text-epi-muted">{linha.ca || "—"}</td>
                    <td className="px-3 py-2 text-epi-muted">{formatarDataCa(linha.validadeCa)}</td>
                    <td className="px-3 py-2 text-epi-muted">
                      {linha.sinal}
                      {linha.quantidade}
                    </td>
                    <td className="px-3 py-2 text-epi-muted">{linha.aceite || linha.observacao || "—"}</td>
                    <td className="px-3 py-2 text-epi-muted">{linha.responsavel}</td>
                    <td className="px-3 py-2 text-epi-muted">{linha.comprovante || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 rounded-lg border border-epi-border p-5">
          <h3 className="text-sm font-semibold text-epi-ink">Declaração do colaborador</h3>
          <p className="mt-2 text-sm text-epi-ink">{TEXTO_DECLARACAO}</p>
          <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="border-t border-epi-ink pt-1 text-xs text-epi-muted">Assinatura do colaborador</div>
            <div className="border-t border-epi-ink pt-1 text-xs text-epi-muted">Data</div>
          </div>
          <p className="mt-6 text-xs text-epi-muted">
            Registros de entrega, troca, devolução e baixa não podem ser excluídos.
            Gerado pelo EPI360 em {new Date().toLocaleString("pt-BR")}.
          </p>
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
