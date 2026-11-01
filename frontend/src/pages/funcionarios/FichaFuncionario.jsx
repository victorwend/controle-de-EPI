import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatarData as formatarDia } from "../../lib/termoRecebimento.js";
import { hojeIso, MOTIVOS_DESLIGAMENTO, textoMotivo, validarDesligamento } from "../../lib/funcionarios.js";

// EPI-330: o Administrador inativa o funcionário desligado (data e motivo)
// ou o reativa. Funcionário não é apagado: o histórico de EPIs fica.

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function FichaFuncionario() {
  const { matricula } = useParams();
  const { pode } = useAuth();
  const podeGerenciar = pode("gerenciar_funcionarios");
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [emPosse, setEmPosse] = useState(0);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: funcionarioData } = await supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, status, data_admissao, data_desligamento, motivo_desligamento, obras(nome)")
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
        const { data: posseData } = await supabase
          .from("posse_epi_funcionario")
          .select("quantidade")
          .eq("funcionario_id", funcionarioData.id);
        if (ativo) {
          setHistorico(itensData ?? []);
          setEmPosse((posseData ?? []).reduce((total, linha) => total + (linha.quantidade ?? 0), 0));
        }
      }
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [matricula, recarregar]);

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
  const estaAtivo = funcionario.status === "ativo";

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
          {estaAtivo && (
            <Link to="/entregas/nova" className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
              + Registrar entrega
            </Link>
          )}
        </div>
      </div>

      {!estaAtivo && (
        <div className="mb-6 max-w-[1060px] rounded-xl border border-epi-border bg-epi-paper px-5 py-4 text-sm text-epi-ink">
          <b>Funcionário inativo</b>
          {funcionario.data_desligamento && <> · desligado em {formatarDia(funcionario.data_desligamento)}</>}
          {funcionario.motivo_desligamento && <> · motivo: {funcionario.motivo_desligamento}</>}
          <p className="mt-1 text-epi-muted">
            Não recebe EPI e não aparece na lista de funcionários (só com o filtro "Mostrar inativos"). O histórico e a
            ficha de EPI continuam guardados.
          </p>
        </div>
      )}

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

      {podeGerenciar && (
        <SituacaoFuncionario
          funcionario={funcionario}
          emPosse={emPosse}
          onAlterado={() => setRecarregar((n) => n + 1)}
        />
      )}
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

// Bloco "Situação do funcionário": inativar (desligamento) ou reativar.
function SituacaoFuncionario({ funcionario, emPosse, onAlterado }) {
  const estaAtivo = funcionario.status === "ativo";
  const [abrindo, setAbrindo] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function gravar(mudancas, mensagemOk) {
    setErro("");
    setAviso("");
    setSalvando(true);
    const { error, count } = await supabase
      .from("funcionarios")
      .update(mudancas, { count: "exact" })
      .eq("id", funcionario.id);
    setSalvando(false);

    if (error) {
      setErro(error.message || "Não foi possível salvar.");
      return;
    }
    if (count === 0) {
      setErro("Você não tem permissão para alterar este funcionário.");
      return;
    }
    setAbrindo(false);
    setAviso(mensagemOk);
    onAlterado();
  }

  function inativar() {
    const mensagem = validarDesligamento({
      data,
      motivo,
      motivoOutro,
      dataAdmissao: funcionario.data_admissao,
    });
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    gravar(
      { status: "inativo", data_desligamento: data, motivo_desligamento: textoMotivo(motivo, motivoOutro) },
      `${funcionario.nome} foi inativado.`
    );
  }

  function reativar() {
    gravar({ status: "ativo" }, `${funcionario.nome} foi reativado.`);
  }

  return (
    <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
      <h3 className="text-sm font-semibold text-epi-ink">Situação do funcionário</h3>

      {erro && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}
      {aviso && <p className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>}

      {estaAtivo && !abrindo && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-epi-muted">
            Funcionário desligado da empresa? Inative-o: ele sai da lista e não recebe mais EPI, mas o histórico fica
            guardado.
          </p>
          <button
            type="button"
            onClick={() => setAbrindo(true)}
            className="whitespace-nowrap rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Inativar (desligamento)
          </button>
        </div>
      )}

      {estaAtivo && abrindo && (
        <div className="mt-4">
          {emPosse > 0 && (
            <p className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Este funcionário ainda tem <b>{emPosse} EPI(s) em posse</b>. O ideal é registrar a devolução antes de
              inativar:{" "}
              <Link to="/entregas/troca-devolucao" className="font-semibold underline">
                Troca / devolução
              </Link>
              .
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block text-[13px] font-medium text-epi-ink">
              Data do desligamento
              <input
                type="date"
                value={data}
                max={hojeIso()}
                onChange={(event) => setData(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
              />
            </label>
            <label className="block text-[13px] font-medium text-epi-ink">
              Motivo
              <select
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
              >
                <option value="">Escolha...</option>
                {MOTIVOS_DESLIGAMENTO.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </label>
            {motivo === "Outro" && (
              <label className="block text-[13px] font-medium text-epi-ink">
                Qual motivo?
                <input
                  type="text"
                  value={motivoOutro}
                  onChange={(event) => setMotivoOutro(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
                />
              </label>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setAbrindo(false);
                setErro("");
              }}
              className="rounded-lg border border-epi-border px-4 py-2 text-sm font-medium text-epi-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={inativar}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Confirmar inativação"}
            </button>
          </div>
        </div>
      )}

      {!estaAtivo && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-epi-muted">
            Voltou a trabalhar na empresa? Reative para ele aparecer na lista e poder receber EPI de novo.
          </p>
          <button
            type="button"
            disabled={salvando}
            onClick={reativar}
            className="whitespace-nowrap rounded-lg border border-epi-brand px-4 py-2 text-sm font-semibold text-epi-brand disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Reativar funcionário"}
          </button>
        </div>
      )}
    </div>
  );
}
