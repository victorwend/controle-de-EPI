import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatarData as formatarDia } from "../../lib/termoRecebimento.js";
import { hojeIso, MOTIVOS_DESLIGAMENTO, textoMotivo, validarDesligamento } from "../../lib/funcionarios.js";
import SePuder from "../../components/SePuder.jsx";
import TransferirFuncionario from "./TransferirFuncionario.jsx";
import { montarHistorico, SELECT_ENTREGAS, SELECT_TROCAS } from "../../lib/historicoEpi.js";
import { baixaInicial, baixaParaSalvar, DESTINOS_BAIXA, validarBaixa } from "../../lib/entregas.js";

// EPI-330: o Administrador inativa o funcionário desligado (data e motivo)
// ou o reativa. Funcionário não é apagado: o histórico de EPIs fica.
//
// EPI-339: o Administrador TRANSFERE o funcionário de obra. O histórico
// mostra a obra de cada entrega e a lista de transferências.

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function FichaFuncionario() {
  const { matricula } = useParams();
  const { pode, usuario } = useAuth();
  const podeGerenciar = pode("gerenciar_funcionarios");
  const ehAdministrador = usuario?.perfil === "administrador";
  const [transferindo, setTransferindo] = useState(false);
  const [avisoTransferencia, setAvisoTransferencia] = useState("");
  const [transferencias, setTransferencias] = useState([]);
  const [funcionario, setFuncionario] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [posseItens, setPosseItens] = useState([]);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data: funcionarioData } = await supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, status, obra_id, data_admissao, data_desligamento, motivo_desligamento, obras(nome)")
        .eq("matricula", matricula)
        .maybeSingle();

      if (!ativo) return;
      setFuncionario(funcionarioData ?? null);

      if (funcionarioData) {
        // EPI-342: entregas E trocas/devoluções/baixas, numa linha do tempo só.
        const [{ data: itensData }, { data: trocasData }] = await Promise.all([
          supabase.from("entrega_itens").select(SELECT_ENTREGAS).eq("entregas.funcionario_id", funcionarioData.id),
          supabase.from("trocas_devolucoes_itens").select(SELECT_TROCAS).eq("funcionario_id", funcionarioData.id),
        ]);
        const { data: posseData } = await supabase
          .from("posse_epi_funcionario")
          .select("epi_id, quantidade, epis(nome, ca)")
          .eq("funcionario_id", funcionarioData.id)
          .gt("quantidade", 0);
        // EPI-339: histórico de transferências entre obras.
        const { data: transferenciasData } = await supabase
          .from("funcionario_transferencias")
          .select(
            "id, data_transferencia, motivo, origem:obras!funcionario_transferencias_obra_origem_id_fkey(nome), destino:obras!funcionario_transferencias_obra_destino_id_fkey(nome), usuarios(nome_completo)"
          )
          .eq("funcionario_id", funcionarioData.id)
          .order("data_transferencia", { ascending: false });
        if (ativo) {
          setTransferencias(transferenciasData ?? []);
          setHistorico(montarHistorico(itensData, trocasData));
          setPosseItens(posseData ?? []);
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

  const ultimaEntrega = historico.find((linha) => linha.categoria === "entrega")?.data;
  const ultimaMovimentacao = historico[0]?.data;
  const totalEmPosse = posseItens.reduce((total, linha) => total + (linha.quantidade ?? 0), 0);
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
          {/* EPI-339: só o Administrador transfere, e só funcionário ativo */}
          {ehAdministrador && estaAtivo && (
            <button
              type="button"
              onClick={() => {
                setAvisoTransferencia("");
                setTransferindo(true);
              }}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink hover:bg-epi-paper"
            >
              Transferir funcionário
            </button>
          )}
          <Link
            to={`/funcionarios/${funcionario.matricula}/historico`}
            className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Histórico completo
          </Link>
          {estaAtivo && (
            <SePuder acao="registrar_entregas">
              <Link to={`/entregas/nova?funcionario=${encodeURIComponent(funcionario.matricula)}`} className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                + Registrar entrega
              </Link>
            </SePuder>
          )}
        </div>
      </div>

      {avisoTransferencia && (
        <p className="mb-6 max-w-[1060px] rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {avisoTransferencia}
        </p>
      )}
      {transferindo && (
        <TransferirFuncionario
          funcionario={funcionario}
          obraAtualId={funcionario.obra_id}
          onCancelar={() => setTransferindo(false)}
          onTransferido={(mensagem) => {
            setTransferindo(false);
            setAvisoTransferencia(mensagem);
            setRecarregar((n) => n + 1);
          }}
        />
      )}

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
          <Stat label="EPIs em posse" valor={totalEmPosse} />
          <Stat label="Última entrega" valor={ultimaEntrega ? formatarData(ultimaEntrega) : "—"} />
          <Stat label="Pendências" valor={0} />
          <Stat label="Obra" valor={funcionario.obras?.nome ?? "—"} />
          <Stat label="Status" valor={funcionario.status === "ativo" ? "Ativo" : "Inativo"} destaque />
        </div>
      </div>

      <div className="mt-6 grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Histórico de EPIs</h3>
          <p className="mt-1 text-xs text-epi-muted">Entregas, trocas, devoluções e baixas (descarte e perda).</p>
          {historico.length === 0 ? (
            <p className="mt-3 text-sm text-epi-muted">Nenhuma movimentação de EPI para este funcionário.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium">Movimentação</th>
                    <th className="py-2 pr-4 font-medium">EPI</th>
                    <th className="py-2 pr-4 font-medium">Qtd.</th>
                    <th className="py-2 pr-4 font-medium">Obra</th>
                    <th className="py-2 font-medium">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((linha) => (
                    <tr key={linha.id} className="border-b border-epi-border text-epi-ink last:border-0">
                      <td className="py-2.5 pr-4 text-epi-muted">{formatarData(linha.data)}</td>
                      <td className="py-2.5 pr-4">
                        <span className="font-medium">{linha.tipo}</span>
                        <span className="block text-xs text-epi-muted">
                          {linha.detalhe}
                          {linha.observacao && ` · ${linha.observacao}`}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {linha.epi}
                        {linha.ca && <span className="block text-xs text-epi-muted">CA {linha.ca}</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-epi-muted">
                        {linha.sinal}
                        {linha.quantidade}
                      </td>
                      <td className="py-2.5 pr-4 text-epi-muted">{linha.obra}</td>
                      <td className="py-2.5 text-epi-muted">{linha.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Ficha de EPI</h3>
          <p className="mt-3 text-xs uppercase text-epi-muted">Última entrega</p>
          <p className="text-sm text-epi-ink">{ultimaEntrega ? formatarData(ultimaEntrega) : "—"}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Última movimentação</p>
          <p className="text-sm text-epi-ink">{ultimaMovimentacao ? formatarData(ultimaMovimentacao) : "—"}</p>
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

      {transferencias.length > 0 && (
        <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Histórico de obras</h3>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">De</th>
                <th className="py-2 pr-4 font-medium">Para</th>
                <th className="py-2 pr-4 font-medium">Motivo</th>
                <th className="py-2 font-medium">Feita por</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map((item) => (
                <tr key={item.id} className="border-b border-epi-border last:border-0">
                  <td className="py-2.5 pr-4 text-epi-muted">{formatarDia(item.data_transferencia)}</td>
                  <td className="py-2.5 pr-4 text-epi-ink">{item.origem?.nome ?? "Sede"}</td>
                  <td className="py-2.5 pr-4 font-medium text-epi-ink">{item.destino?.nome ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-epi-muted">{item.motivo || "—"}</td>
                  <td className="py-2.5 text-epi-muted">{item.usuarios?.nome_completo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {podeGerenciar && (
        <SituacaoFuncionario
          funcionario={funcionario}
          posseItens={posseItens}
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
function SituacaoFuncionario({ funcionario, posseItens, onAlterado }) {
  const estaAtivo = funcionario.status === "ativo";
  const [abrindo, setAbrindo] = useState(false);
  const [data, setData] = useState(hojeIso());
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  // EPI-340: baixa dos EPIs que estão com o funcionário
  const [baixa, setBaixa] = useState([]);
  const [locais, setLocais] = useState([]);
  const [localId, setLocalId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function abrirDesligamento() {
    setErro("");
    setAviso("");
    setBaixa(baixaInicial(posseItens));
    const { data: locaisData } = await supabase
      .from("locais_estoque")
      .select("id, nome")
      .eq("status", "ativo")
      .order("nome");
    setLocais(locaisData ?? []);
    setLocalId(locaisData?.[0]?.id ?? "");
    setAbrindo(true);
  }

  function mudarDestino(epiId, destino) {
    setBaixa((atual) => atual.map((item) => (item.epiId === epiId ? { ...item, destino } : item)));
  }

  function mesmoDestinoParaTodos(destino) {
    setBaixa((atual) => atual.map((item) => ({ ...item, destino })));
  }

  // EPI-340: desliga pela função do banco, que dá baixa em TUDO e inativa
  // numa operação só (se algo falhar, nada é gravado).
  async function desligar() {
    const mensagem =
      validarDesligamento({ data, motivo, motivoOutro, dataAdmissao: funcionario.data_admissao }) ||
      validarBaixa(baixa, localId);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setErro("");
    setSalvando(true);
    const vaiAlgoParaEstoque = baixa.some((item) => item.destino === "estoque");
    const { error } = await supabase.rpc("desligar_funcionario", {
      p_funcionario_id: funcionario.id,
      p_data: data,
      p_motivo: textoMotivo(motivo, motivoOutro),
      p_local_id: vaiAlgoParaEstoque ? localId : null,
      p_itens: baixaParaSalvar(baixa),
    });
    setSalvando(false);
    if (error) {
      setErro(error.message || "Não foi possível desligar.");
      return;
    }
    setAbrindo(false);
    setAviso(
      baixa.length > 0
        ? `${funcionario.nome} foi desligado e a baixa de ${baixa.length} EPI(s) foi registrada.`
        : `${funcionario.nome} foi desligado.`
    );
    onAlterado();
  }

  async function reativar() {
    setErro("");
    setAviso("");
    setSalvando(true);
    const { error, count } = await supabase
      .from("funcionarios")
      .update({ status: "ativo" }, { count: "exact" })
      .eq("id", funcionario.id);
    setSalvando(false);
    if (error) {
      setErro(error.message || "Não foi possível reativar.");
      return;
    }
    if (count === 0) {
      setErro("Você não tem permissão para alterar este funcionário.");
      return;
    }
    setAviso(`${funcionario.nome} foi reativado.`);
    onAlterado();
  }

  const precisaLocal = baixa.some((item) => item.destino === "estoque");

  return (
    <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
      <h3 className="text-sm font-semibold text-epi-ink">Situação do funcionário</h3>

      {erro && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}
      {aviso && <p className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>}

      {estaAtivo && !abrindo && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-epi-muted">
            Funcionário desligado da empresa? Registre o desligamento: você dá baixa nos EPIs que estão com ele e ele sai
            da lista, mas o histórico fica guardado.
          </p>
          <button
            type="button"
            onClick={abrirDesligamento}
            className="whitespace-nowrap rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Desligar funcionário
          </button>
        </div>
      )}

      {estaAtivo && abrindo && (
        <div className="mt-4">
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

          {/* EPI-340: baixa obrigatória de tudo o que está com o funcionário */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-epi-ink">Baixa dos EPIs em posse</p>
            {baixa.length === 0 ? (
              <p className="mt-2 text-sm text-epi-muted">Nenhum EPI em posse. Nada para dar baixa.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-epi-muted">
                  Diga o que aconteceu com cada EPI que está com ele. Só dá para desligar depois de dar baixa em todos.
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="text-epi-muted">Marcar todos como:</span>
                  {DESTINOS_BAIXA.map((opcao) => (
                    <button
                      key={opcao.valor}
                      type="button"
                      onClick={() => mesmoDestinoParaTodos(opcao.valor)}
                      className="rounded-full border border-epi-border px-2 py-0.5 text-epi-ink hover:bg-epi-paper"
                    >
                      {opcao.label}
                    </button>
                  ))}
                </div>
                <table className="mt-3 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                      <th className="py-2 pr-4 font-medium">EPI</th>
                      <th className="py-2 pr-4 font-medium">CA</th>
                      <th className="py-2 pr-4 font-medium">Qtd.</th>
                      <th className="py-2 font-medium">O que aconteceu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baixa.map((item) => (
                      <tr key={item.epiId} className="border-b border-epi-border last:border-0">
                        <td className="py-2 pr-4 font-medium text-epi-ink">{item.nome}</td>
                        <td className="py-2 pr-4 text-epi-muted">{item.ca || "—"}</td>
                        <td className="py-2 pr-4 text-epi-muted">{item.quantidade}</td>
                        <td className="py-2">
                          <select
                            value={item.destino}
                            onChange={(event) => mudarDestino(item.epiId, event.target.value)}
                            className="h-9 w-full rounded-lg border border-epi-border px-2 text-sm text-epi-ink"
                          >
                            <option value="">Escolha...</option>
                            {DESTINOS_BAIXA.map((opcao) => (
                              <option key={opcao.valor} value={opcao.valor}>
                                {opcao.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {precisaLocal && (
                  <label className="mt-3 block max-w-sm text-[13px] font-medium text-epi-ink">
                    Local de estoque que recebe os devolvidos
                    <select
                      value={localId}
                      onChange={(event) => setLocalId(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
                    >
                      <option value="">Escolha...</option>
                      {locais.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
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
              onClick={desligar}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Confirmar desligamento"}
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
