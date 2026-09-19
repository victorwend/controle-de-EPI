import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { MATRIZ_POR_FUNCAO, FUNCOES_MATRIZ } from "../../data/episConfig.js";

const LOCAL_PADRAO_NOME = "Almoxarifado Central";

// Tela 03.07 — Entregas — Em lote. Diferente das outras telas de Entregas, o
// Figma preenche esta com dado só estrutural ("Funcionário 01 • matrícula" x4,
// sem nomes reais) — um indício de que ela é montada dinamicamente a partir de
// Obra + Equipe/função, não de uma lista fixa. Cada confirmação individual
// reaproveita a mesma função registrar_entrega() da entrega avulsa — um lote
// nada mais é que N entregas independentes com a mesma lista de itens.
export default function LoteEntrega() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [obras, setObras] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [epis, setEpis] = useState([]);
  const [saldoMap, setSaldoMap] = useState({});
  const [localPadrao, setLocalPadrao] = useState(null);

  const [obraId, setObraId] = useState("");
  const [funcao, setFuncao] = useState("");
  const [selecionados, setSelecionados] = useState({});
  const [step, setStep] = useState("config");
  const [status, setStatus] = useState({});
  const [erroGeral, setErroGeral] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const [{ data: obrasData }, { data: funcionariosData }, { data: episData }, { data: locaisData }] = await Promise.all([
        supabase.from("obras").select("id, nome").order("nome"),
        supabase.from("funcionarios").select("id, matricula, nome, funcao, obra_id, status").eq("status", "ativo"),
        supabase.from("epis").select("id, nome, ca").order("nome"),
        supabase.from("locais_estoque").select("id, nome").eq("nome", LOCAL_PADRAO_NOME).limit(1),
      ]);

      if (!ativo) return;
      setObras(obrasData ?? []);
      setFuncionarios(funcionariosData ?? []);
      setEpis(episData ?? []);

      const local = locaisData?.[0] ?? null;
      setLocalPadrao(local);

      if (local) {
        const { data: saldoData } = await supabase.from("saldo_estoque").select("epi_id, saldo").eq("local_id", local.id);
        if (!ativo) return;
        setSaldoMap(Object.fromEntries((saldoData ?? []).map((s) => [s.epi_id, s.saldo])));
      }

      setCarregando(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const funcionariosFiltrados = useMemo(() => {
    if (!obraId || !funcao) return [];
    return funcionarios.filter((f) => f.obra_id === obraId && f.funcao === funcao);
  }, [obraId, funcao, funcionarios]);

  function aplicarFiltro(novaObraId, novaFuncao) {
    setObraId(novaObraId);
    setFuncao(novaFuncao);
    const filtrados = funcionarios.filter((f) => f.obra_id === novaObraId && f.funcao === novaFuncao);
    const marcados = {};
    filtrados.forEach((f) => (marcados[f.id] = true));
    setSelecionados(marcados);
  }

  const selecionadosCount = Object.values(selecionados).filter(Boolean).length;

  const itensSugeridos = useMemo(() => {
    const matriz = (MATRIZ_POR_FUNCAO[funcao] ?? []).filter((m) => m.obrigatoriedade === "Obrigatório");
    return matriz
      .map((m) => {
        const epi = epis.find((e) => e.nome === m.epi);
        return epi ? { epiId: epi.id, nome: epi.nome, quantidade: m.quantidade } : null;
      })
      .filter(Boolean);
  }, [funcao, epis]);

  const totalUnidades = itensSugeridos.reduce((soma, item) => soma + item.quantidade * selecionadosCount, 0);

  const itensSemSaldo = itensSugeridos
    .map((item) => {
      const necessario = item.quantidade * selecionadosCount;
      const disponivel = saldoMap[item.epiId] ?? 0;
      return { ...item, necessario, disponivel };
    })
    .filter((item) => item.necessario > item.disponivel);

  function iniciarConfirmacao() {
    const inicial = {};
    Object.keys(selecionados)
      .filter((id) => selecionados[id])
      .forEach((id) => (inicial[id] = "pendente"));
    setStatus(inicial);
    setStep("confirmando");
  }

  async function confirmarPessoa(funcionarioId) {
    setErroGeral("");

    if (!localPadrao) {
      setErroGeral(`Cadastre o local "${LOCAL_PADRAO_NOME}" antes de continuar.`);
      return;
    }

    const { error } = await supabase.rpc("registrar_entrega", {
      p_funcionario_id: funcionarioId,
      p_local_id: localPadrao.id,
      p_itens: itensSugeridos.map((item) => ({ epi_id: item.epiId, quantidade: item.quantidade })),
      p_observacao: "Entrega em lote",
    });

    if (error) {
      setStatus((atual) => ({ ...atual, [funcionarioId]: "falhou" }));
      setErroGeral(error.message || "Falha ao confirmar um dos funcionários.");
      return;
    }

    setStatus((atual) => ({ ...atual, [funcionarioId]: "confirmado" }));
  }

  function marcarFalha(funcionarioId) {
    setStatus((atual) => ({ ...atual, [funcionarioId]: "falhou" }));
  }

  const pendentes = Object.values(status).filter((s) => s === "pendente").length;
  const confirmados = Object.entries(status).filter(([, s]) => s === "confirmado");
  const falharam = Object.entries(status).filter(([, s]) => s === "falhou");

  const headers = {
    config: { title: "Entrega de EPI em lote", subtitle: "Prepare a mesma entrega para vários funcionários ou para uma equipe." },
    confirmando: { title: "Confirmação individual", subtitle: "Cada funcionário confirma a própria entrega antes da baixa definitiva." },
    concluida: { title: "Entrega em lote concluída", subtitle: "Comprovantes gerados para os funcionários confirmados." },
  };

  if (carregando) {
    return (
      <AppShell title="Entrega de EPI em lote" activeSection="Entregas de EPI">
        <p className="text-sm text-epi-muted">Carregando...</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={headers[step].title} subtitle={headers[step].subtitle} activeSection="Entregas de EPI">
      {step === "config" && (
        <div className="max-w-[1060px] space-y-6">
          <div className="rounded-xl border border-epi-border bg-white p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
              <label className="block text-[13px] font-medium text-epi-ink">
                Obra
                <select
                  value={obraId}
                  onChange={(event) => aplicarFiltro(event.target.value, funcao)}
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                >
                  <option value="">Selecione a obra</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[13px] font-medium text-epi-ink">
                Equipe / função
                <select
                  value={funcao}
                  onChange={(event) => aplicarFiltro(obraId, event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                >
                  <option value="">Selecione a função</option>
                  {FUNCOES_MATRIZ.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-[13px] font-medium text-epi-ink">Funcionários selecionados</p>
                <p className="mt-2 text-2xl font-semibold text-epi-brand">{selecionadosCount}</p>
              </div>
            </div>
          </div>

          {obraId && funcao && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-epi-border bg-white p-6">
                <h3 className="text-sm font-semibold text-epi-ink">1. Selecionar funcionários</h3>
                <div className="mt-3 space-y-2">
                  {funcionariosFiltrados.length === 0 && (
                    <p className="text-sm text-epi-muted">Nenhum funcionário ativo encontrado para esse filtro.</p>
                  )}
                  {funcionariosFiltrados.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm text-epi-ink">
                      <input
                        type="checkbox"
                        checked={Boolean(selecionados[f.id])}
                        onChange={() => setSelecionados((atual) => ({ ...atual, [f.id]: !atual[f.id] }))}
                        className="h-4 w-4 accent-epi-brand"
                      />
                      {f.nome} • matrícula {f.matricula}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-epi-border bg-white p-6">
                <h3 className="text-sm font-semibold text-epi-ink">2. EPIs da entrega</h3>
                <p className="mt-1 text-xs text-epi-muted">Sugestão baseada na matriz da função</p>
                {itensSugeridos.length === 0 ? (
                  <p className="mt-4 text-sm text-epi-muted">Nenhuma matriz definida para esta função ainda.</p>
                ) : (
                  <>
                    <div className="mt-3 space-y-2">
                      {itensSugeridos.map((item) => (
                        <div key={item.epiId} className="flex items-center justify-between text-sm">
                          <span className="text-epi-ink">{item.nome}</span>
                          <span className="text-epi-muted">{item.quantidade} por funcionário</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-[#EBF5F0] px-4 py-3 text-sm text-epi-brand">
                      Total previsto: {totalUnidades} unidades para {selecionadosCount} funcionários
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {itensSemSaldo.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">Saldo insuficiente para o lote</p>
              <div className="mt-2 space-y-1 text-sm text-red-700/80">
                {itensSemSaldo.map((item) => (
                  <p key={item.epiId}>
                    {item.nome}: necessário {item.necessario}, disponível {item.disponivel}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-epi-paper px-5 py-4 text-sm text-epi-muted">
            <p className="font-semibold text-epi-ink">Confirmação individual</p>
            <p className="mt-1">Cada funcionário confirma a própria entrega antes da baixa definitiva.</p>
          </div>

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
              disabled={selecionadosCount === 0 || itensSugeridos.length === 0 || itensSemSaldo.length > 0}
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
                setObraId("");
                setFuncao("");
                setSelecionados({});
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
