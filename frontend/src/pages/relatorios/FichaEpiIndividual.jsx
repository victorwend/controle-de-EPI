import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { formatarData as formatarDataCa, rotuloMetodoAceite, TEXTO_DECLARACAO } from "../../lib/termoRecebimento";

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
        const [{ data: itensData }, { data: empresaData }] = await Promise.all([
          supabase
            .from("entrega_itens")
            .select(
              "id, quantidade, epis(nome, ca, validade_ca), entregas!inner(funcionario_id, created_at, comprovante, aceite_metodo, usuarios(nome_completo))"
            )
            .eq("entregas.funcionario_id", funcionarioData.id),
          supabase.from("empresas").select("razao_social").limit(1),
        ]);
        if (!ativo) return;
        // Mais recente primeiro, pela data da entrega.
        const ordenados = [...(itensData ?? [])].sort(
          (a, b) => new Date(b.entregas.created_at) - new Date(a.entregas.created_at)
        );
        setHistorico(ordenados);
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

  const ultimaEntrega = historico[0]?.entregas?.created_at;

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
          <Stat label="Obra" valor={funcionario.obras?.nome ?? "—"} />
          <Stat label="Status" valor={funcionario.status === "ativo" ? "Ativo" : "Inativo"} />
          <Stat label="Última entrega" valor={ultimaEntrega ? formatarData(ultimaEntrega) : "—"} />
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg border border-epi-border">
          <h3 className="px-4 pt-4 text-sm font-semibold text-epi-ink">EPIs entregues ao colaborador</h3>
          {historico.length === 0 ? (
            <p className="px-4 pb-4 pt-3 text-sm text-epi-muted">Nenhuma entrega registrada.</p>
          ) : (
            <table className="mt-3 w-full text-left text-xs">
              <thead className="border-y border-epi-border uppercase text-epi-muted">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">EPI</th>
                  <th className="px-3 py-2">CA</th>
                  <th className="px-3 py-2">Validade do CA</th>
                  <th className="px-3 py-2">Qtd.</th>
                  <th className="px-3 py-2">Aceite</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item) => (
                  <tr key={item.id} className="border-b border-epi-border last:border-0">
                    <td className="px-3 py-2 text-epi-ink">{formatarData(item.entregas.created_at)}</td>
                    <td className="px-3 py-2 text-epi-ink">{item.epis?.nome ?? "—"}</td>
                    <td className="px-3 py-2 text-epi-muted">{item.epis?.ca || "—"}</td>
                    <td className="px-3 py-2 text-epi-muted">{formatarDataCa(item.epis?.validade_ca)}</td>
                    <td className="px-3 py-2 text-epi-muted">{item.quantidade}</td>
                    <td className="px-3 py-2 text-epi-muted">{rotuloMetodoAceite(item.entregas.aceite_metodo)}</td>
                    <td className="px-3 py-2 text-epi-muted">{item.entregas.usuarios?.nome_completo ?? "—"}</td>
                    <td className="px-3 py-2 text-epi-muted">{item.entregas.comprovante}</td>
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
            Registros de entrega não podem ser excluídos. Trocas e devoluções ficam no histórico do colaborador.
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
