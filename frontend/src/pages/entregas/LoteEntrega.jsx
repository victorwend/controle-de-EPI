import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useLocalEstoque } from "../../hooks/useLocalEstoque";
import SeletorLocalEstoque from "../../components/SeletorLocalEstoque.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { imprimirHtml, montarListaAssinaturasLote } from "../../lib/termoRecebimento";
import { MOTIVOS_ENTREGA } from "../../lib/entregas.js";
import { filtrarFuncionarios } from "../../lib/funcionarios.js";
import {
  adicionarEpi,
  alternarId,
  alternarTodos,
  faltaSaldo,
  funcaoComum,
  itensParaRpc,
  mudarQuantidade,
  pendenciasLote,
  removerEpi,
  selecaoInicial,
  sugestaoDaMatriz,
  todosMarcados,
} from "../../lib/loteEntrega.js";
import SePuder from "../../components/SePuder.jsx";

// EPI-273: enquanto a biometria não é real, cada entrega é concluída pelo
// botão de confirmação do responsável. A lista impressa é opcional.
const METODO_ACEITE = "confirmacao_responsavel";

// Tela 03.07 — Entregas — Em lote. Cada confirmação individual reaproveita a
// mesma função registrar_entrega() da entrega avulsa — um lote nada mais é
// que N entregas independentes com a mesma lista de itens.
//
// EPI-343 (pedido do Victor, 01/11/2026):
//  - o lote é montado escolhendo FUNCIONÁRIOS (busca + obra), não mais
//    obra + função; ninguém vem marcado: o usuário marca quem recebe;
//  - os EPIs são escolhidos na tela; a matriz da função é só um atalho
//    ("Usar EPIs da matriz") quando todos os marcados têm a mesma função;
//  - o botão "Continuar" diz o que falta, em vez de ficar apagado sem
//    explicação (era o "não está funcionando").
export default function LoteEntrega() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [obras, setObras] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [epis, setEpis] = useState([]);
  const [matriz, setMatriz] = useState([]);
  // EPI-325: local de estoque escolhido na tela.
  const { locais, local: localPadrao, localId, setLocalId, saldoMap, carregandoLocais, carregandoSaldo } =
    useLocalEstoque();

  const [busca, setBusca] = useState("");
  const [obraId, setObraId] = useState("");
  // EPI-340: um motivo para o lote todo (ex.: admissão de uma equipe nova).
  const [motivo, setMotivo] = useState("admissao");
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [itens, setItens] = useState([]);
  const [epiParaAdicionar, setEpiParaAdicionar] = useState("");
  const [step, setStep] = useState("config");
  const [status, setStatus] = useState({});
  const [erroGeral, setErroGeral] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const [{ data: obrasData }, { data: funcionariosData }, { data: episData }, { data: matrizData }] =
        await Promise.all([
          supabase.from("obras").select("id, nome").order("nome"),
          supabase
            .from("funcionarios")
            .select("id, matricula, nome, funcao, funcao_id, obra_id, status, obras(nome)")
            .eq("status", "ativo")
            .order("nome"),
          supabase.from("epis").select("id, nome, ca, validade_ca").order("nome"),
          supabase.from("matriz_epi_funcao").select("funcao_id, epi_id, quantidade, obrigatorio"),
        ]);

      if (!ativo) return;
      setObras(obrasData ?? []);
      setFuncionarios(funcionariosData ?? []);
      setEpis(episData ?? []);
      setMatriz(matrizData ?? []);
      // Se outra tela abrir o lote com funcionários já escolhidos
      // (navigate("/entregas/lote", { state: { funcionarioIds } })), eles vêm marcados.
      setSelecionados(selecaoInicial(location.state?.funcionarioIds, funcionariosData ?? []));
      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [location.state]);

  const funcionariosVisiveis = useMemo(
    () => filtrarFuncionarios(funcionarios, { busca, obraId }),
    [busca, obraId, funcionarios]
  );
  const funcionariosSelecionados = useMemo(
    () => funcionarios.filter((f) => selecionados.has(f.id)),
    [funcionarios, selecionados]
  );
  const selecionadosCount = funcionariosSelecionados.length;

  const funcaoDoGrupo = funcaoComum(funcionariosSelecionados);
  const sugestao = useMemo(() => sugestaoDaMatriz(funcaoDoGrupo, matriz, epis), [funcaoDoGrupo, matriz, epis]);

  const episDisponiveis = epis.filter((epi) => !itens.some((item) => item.epiId === epi.id));
  const totalUnidades = itens.reduce((soma, item) => soma + item.quantidade * selecionadosCount, 0);
  const itensSemSaldo = faltaSaldo(itens, selecionadosCount, saldoMap);
  const pendencias = pendenciasLote({
    quantidadePessoas: selecionadosCount,
    itens,
    motivo,
    temLocal: Boolean(localPadrao),
    semSaldo: carregandoSaldo ? [] : itensSemSaldo,
  });
  const podeContinuar = pendencias.length === 0 && !carregandoSaldo;

  function incluirEpi() {
    const epi = epis.find((e) => e.id === epiParaAdicionar);
    setItens((atual) => adicionarEpi(atual, epi));
    setEpiParaAdicionar("");
  }

  function iniciarConfirmacao() {
    const inicial = {};
    funcionariosSelecionados.forEach((f) => (inicial[f.id] = "pendente"));
    setStatus(inicial);
    setStep("confirmando");
  }

  async function confirmarPessoa(funcionarioId) {
    setErroGeral("");

    if (!localPadrao) {
      setErroGeral("Escolha o local de estoque antes de continuar.");
      return;
    }

    const { error } = await supabase.rpc("registrar_entrega", {
      p_funcionario_id: funcionarioId,
      p_local_id: localPadrao.id,
      p_itens: itensParaRpc(itens),
      p_observacao: "Entrega em lote",
      p_aceite_metodo: METODO_ACEITE,
      p_motivo: motivo,
    });

    if (error) {
      setStatus((atual) => ({ ...atual, [funcionarioId]: "falhou" }));
      setErroGeral(error.message || "Falha ao confirmar um dos funcionários.");
      return;
    }

    setStatus((atual) => ({ ...atual, [funcionarioId]: "confirmado" }));
  }

  function imprimirListaAssinaturas() {
    setErroGeral("");
    const pessoas = Object.keys(status)
      .map((id) => funcionarios.find((f) => f.id === id))
      .filter(Boolean);
    try {
      imprimirHtml(
        montarListaAssinaturasLote({
          local: localPadrao?.nome,
          itens,
          funcionarios: pessoas,
          responsavel: usuario?.nome_completo,
        })
      );
    } catch (falha) {
      setErroGeral(falha.message);
    }
  }

  function marcarFalha(funcionarioId) {
    setStatus((atual) => ({ ...atual, [funcionarioId]: "falhou" }));
  }

  const pendentes = Object.values(status).filter((s) => s === "pendente").length;
  const confirmados = Object.entries(status).filter(([, s]) => s === "confirmado");
  const falharam = Object.entries(status).filter(([, s]) => s === "falhou");

  const headers = {
    config: { title: "Entrega de EPI em lote", subtitle: "Marque os funcionários que vão receber e escolha os EPIs." },
    confirmando: { title: "Confirmação individual", subtitle: "Cada funcionário confirma a própria entrega antes da baixa definitiva." },
    concluida: { title: "Entrega em lote concluída", subtitle: "Comprovantes gerados para os funcionários confirmados." },
  };

  const campo =
    "mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand";

  if (carregando || carregandoLocais) {
    return (
      <AppShell title="Entrega de EPI em lote" activeSection="Entregas de EPI">
        <p className="text-sm text-epi-muted">Carregando...</p>
      </AppShell>
    );
  }

  if (locais.length === 0) {
    return (
      <AppShell title="Entrega de EPI em lote" activeSection="Entregas de EPI">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          <h2 className="text-base font-semibold text-epi-ink">Cadastre um local de estoque antes de continuar</h2>
          <p className="mt-2">A entrega em lote desconta os EPIs do saldo de um local de estoque.</p>
          <SePuder acao="gerenciar_estoque">
            <Link to="/estoque/locais/novo" className="mt-3 inline-block font-semibold text-epi-brand">
              Cadastrar local de estoque →
            </Link>
          </SePuder>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={headers[step].title} subtitle={headers[step].subtitle} activeSection="Entregas de EPI">
      {step === "config" && (
        <SeletorLocalEstoque
          rotulo="Entregar a partir do estoque"
          locais={locais}
          value={localId}
          onChange={setLocalId}
          carregandoSaldo={carregandoSaldo}
        />
      )}

      {step === "config" && (
        <div className="max-w-[1060px] space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* 1. Funcionários */}
            <div className="rounded-xl border border-epi-border bg-white p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-epi-ink">1. Funcionários que vão receber</h3>
                <span className="text-sm font-semibold text-epi-brand">{selecionadosCount} marcado(s)</span>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar nome, matrícula ou função..."
                  className="h-10 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
                <select
                  value={obraId}
                  onChange={(event) => setObraId(event.target.value)}
                  className="h-10 w-40 rounded-lg border border-epi-border px-2 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                >
                  <option value="">Todas as obras</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center justify-between border-b border-epi-border pb-2 text-xs text-epi-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todosMarcados(selecionados, funcionariosVisiveis)}
                    onChange={() => setSelecionados((atual) => alternarTodos(atual, funcionariosVisiveis))}
                    disabled={funcionariosVisiveis.length === 0}
                    className="h-4 w-4 accent-epi-brand"
                  />
                  Marcar todos da lista ({funcionariosVisiveis.length})
                </label>
                {selecionadosCount > 0 && (
                  <button type="button" onClick={() => setSelecionados(new Set())} className="font-semibold text-epi-brand">
                    Desmarcar todos
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                {funcionariosVisiveis.length === 0 && (
                  <p className="py-3 text-sm text-epi-muted">Nenhum funcionário ativo encontrado.</p>
                )}
                {funcionariosVisiveis.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-epi-paper">
                    <input
                      type="checkbox"
                      checked={selecionados.has(f.id)}
                      onChange={() => setSelecionados((atual) => alternarId(atual, f.id))}
                      className="h-4 w-4 accent-epi-brand"
                    />
                    <span className="text-epi-ink">{f.nome}</span>
                    <span className="text-xs text-epi-muted">
                      • {f.matricula} • {f.funcao || "sem função"} • {f.obras?.nome ?? "sem obra"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. EPIs */}
            <div className="rounded-xl border border-epi-border bg-white p-6">
              <h3 className="text-sm font-semibold text-epi-ink">2. EPIs da entrega</h3>
              <p className="mt-1 text-xs text-epi-muted">Quantidade por funcionário. O saldo é do local escolhido acima.</p>

              {sugestao.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItens(sugestao)}
                  className="mt-3 rounded-lg border border-epi-brand px-3 py-1.5 text-xs font-semibold text-epi-brand hover:bg-epi-paper"
                >
                  Usar EPIs obrigatórios da função ({funcionariosSelecionados[0]?.funcao})
                </button>
              )}

              <div className="mt-3 flex gap-2">
                <select
                  value={epiParaAdicionar}
                  onChange={(event) => setEpiParaAdicionar(event.target.value)}
                  className="h-10 flex-1 rounded-lg border border-epi-border px-2 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                >
                  <option value="">Escolha um EPI...</option>
                  {episDisponiveis.map((epi) => (
                    <option key={epi.id} value={epi.id}>
                      {epi.nome} (CA {epi.ca}) — saldo {saldoMap[epi.id] ?? 0}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={incluirEpi}
                  disabled={!epiParaAdicionar}
                  className="rounded-lg bg-epi-brand px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {itens.length === 0 && <p className="text-sm text-epi-muted">Nenhum EPI adicionado.</p>}
                {itens.map((item) => (
                  <div key={item.epiId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1 text-epi-ink">
                      {item.nome}
                      <span className="block text-xs text-epi-muted">
                        CA {item.ca || "—"} • saldo {saldoMap[item.epiId] ?? 0}
                      </span>
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(event) => setItens((atual) => mudarQuantidade(atual, item.epiId, event.target.value))}
                      aria-label={`Quantidade de ${item.nome} por funcionário`}
                      className="h-9 w-16 rounded-lg border border-epi-border px-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setItens((atual) => removerEpi(atual, item.epiId))}
                      className="text-xs font-medium text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {itens.length > 0 && (
                <div className="mt-4 rounded-lg bg-[#EBF5F0] px-4 py-3 text-sm text-epi-brand">
                  Total previsto: {totalUnidades} unidades para {selecionadosCount} funcionário(s)
                </div>
              )}

              <label className="mt-4 block text-[13px] font-medium text-epi-ink">
                Motivo da entrega
                <select value={motivo} onChange={(event) => setMotivo(event.target.value)} className={campo}>
                  <option value="">Escolha...</option>
                  {MOTIVOS_ENTREGA.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-lg bg-epi-paper px-5 py-4 text-sm text-epi-muted">
            <p className="font-semibold text-epi-ink">Confirmação individual</p>
            <p className="mt-1">Na próxima tela, cada funcionário confirma a própria entrega antes da baixa definitiva.</p>
          </div>

          {pendencias.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-800">
              <p className="font-semibold">Para continuar:</p>
              <ul className="mt-1 list-disc pl-5">
                {pendencias.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/entregas")}
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!podeContinuar}
              onClick={iniciarConfirmacao}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Continuar entrega em lote →
            </button>
          </div>
        </div>
      )}

      {step === "confirmando" && (
        <div className="max-w-[1060px] space-y-6">
          <div className="rounded-xl border border-epi-border bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-epi-paper p-4">
              <p className="text-sm text-epi-ink">
                Entregue os itens a cada colaborador e clique em <b>Confirmar entrega</b> ao lado do nome. O sistema
                registra quem confirmou e quando.
              </p>
              <button
                type="button"
                onClick={imprimirListaAssinaturas}
                className="text-sm font-semibold text-epi-brand underline"
              >
                Imprimir lista de assinaturas (opcional)
              </button>
            </div>
            <div className="space-y-3">
              {Object.keys(status).map((funcionarioId) => {
                const f = funcionarios.find((fn) => fn.id === funcionarioId);
                const s = status[funcionarioId];
                return (
                  <div key={funcionarioId} className="flex items-center justify-between border-b border-epi-border pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-epi-ink">{f?.nome}</p>
                      <p className="text-xs text-epi-muted">Matrícula {f?.matricula}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s === "pendente" && (
                        <>
                          <button
                            type="button"
                            onClick={() => marcarFalha(funcionarioId)}
                            className="text-sm font-medium text-red-600"
                          >
                            Marcar falha
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarPessoa(funcionarioId)}
                            className="rounded-lg bg-epi-brand px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                          >
                            Confirmar entrega
                          </button>
                        </>
                      )}
                      {s === "confirmado" && (
                        <span className="rounded-md bg-[#EBF5F0] px-3 py-1.5 text-xs font-medium text-epi-brand">
                          ✓ Confirmado
                        </span>
                      )}
                      {s === "falhou" && (
                        <>
                          <span className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                            Falhou
                          </span>
                          <button
                            type="button"
                            onClick={() => setStatus((atual) => ({ ...atual, [funcionarioId]: "pendente" }))}
                            className="text-sm font-medium text-epi-ink underline"
                          >
                            Tentar novamente
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {erroGeral && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erroGeral}</p>
          )}

          <p className="text-sm text-epi-muted">
            Uma falha individual não bloqueia os demais — cada aceite é registrado separadamente (RN071/RN072).
          </p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep("config")}
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              ← Voltar
            </button>
            <button
              type="button"
              disabled={pendentes > 0 || confirmados.length === 0}
              onClick={() => setStep("concluida")}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Concluir lote
            </button>
          </div>
        </div>
      )}

      {step === "concluida" && (
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF5F0] text-lg text-epi-brand">✓</div>
          <h2 className="mt-4 text-xl font-semibold text-epi-ink">
            {confirmados.length} de {confirmados.length + falharam.length} entregas confirmadas
          </h2>
          <p className="mt-1 text-sm text-epi-muted">A baixa no estoque foi atualizada para os funcionários confirmados.</p>

          <div className="mx-auto mt-6 max-w-[520px] space-y-2 text-left">
            {confirmados.map(([funcionarioId]) => {
              const f = funcionarios.find((fn) => fn.id === funcionarioId);
              return (
                <div key={funcionarioId} className="rounded-lg bg-[#EBF5F0] p-4">
                  <p className="text-sm font-semibold text-epi-ink">{f?.nome}</p>
                  <p className="text-xs text-epi-muted">Matrícula {f?.matricula}</p>
                </div>
              );
            })}
            {falharam.map(([funcionarioId]) => {
              const f = funcionarios.find((fn) => fn.id === funcionarioId);
              return (
                <div key={funcionarioId} className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm font-semibold text-epi-ink">{f?.nome}</p>
                  <p className="text-xs text-red-700">Falhou — precisa ser refeita individualmente</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/entregas")}
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Ver entregas
            </button>
            <button
              type="button"
              onClick={() => {
                setSelecionados(new Set());
                setItens([]);
                setStatus({});
                setStep("config");
              }}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Nova entrega em lote
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
