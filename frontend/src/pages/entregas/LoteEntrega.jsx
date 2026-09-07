import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { MATRIZ_POR_FUNCAO, FUNCOES_MATRIZ } from "../../data/episConfig.js";
import { SALDO_POR_LOCAL } from "../../data/estoqueConfig.js";

const OBRAS_COM_EQUIPE = ["BR-040", "Usina", "Britagem"];
const LOCAL_PADRAO = "Almoxarifado Central";

// Tela 03.07 — Entregas — Em lote. Diferente das outras telas de Entregas, o
// Figma preenche esta com dado só estrutural ("Funcionário 01 • matrícula" x4,
// sem nomes reais) — um indício de que ela é montada dinamicamente a partir de
// Obra + Equipe/função, não de uma lista fixa. Aqui os dois seletores filtram
// FUNCIONARIOS de verdade em vez de reproduzir o texto de espaço reservado.
export default function LoteEntrega() {
  const navigate = useNavigate();
  const [obra, setObra] = useState("");
  const [funcao, setFuncao] = useState("");
  const [selecionados, setSelecionados] = useState({});
  const [step, setStep] = useState("config");
  const [status, setStatus] = useState({});

  const funcionariosFiltrados = useMemo(() => {
    if (!obra || !funcao) return [];
    return FUNCIONARIOS.filter((f) => f.obra === obra && f.funcao === funcao && f.status === "Ativo");
  }, [obra, funcao]);

  function aplicarFiltro(novaObra, novaFuncao) {
    setObra(novaObra);
    setFuncao(novaFuncao);
    const filtrados = FUNCIONARIOS.filter((f) => f.obra === novaObra && f.funcao === novaFuncao && f.status === "Ativo");
    const marcados = {};
    filtrados.forEach((f) => (marcados[f.matricula] = true));
    setSelecionados(marcados);
  }

  const selecionadosCount = Object.values(selecionados).filter(Boolean).length;
  const itensSugeridos = (MATRIZ_POR_FUNCAO[funcao] ?? []).filter((m) => m.obrigatoriedade === "Obrigatório");
  const totalUnidades = itensSugeridos.reduce((soma, item) => soma + item.quantidade * selecionadosCount, 0);

  const itensSemSaldo = itensSugeridos
    .map((item) => {
      const necessario = item.quantidade * selecionadosCount;
      const disponivel = SALDO_POR_LOCAL[item.epi]?.[LOCAL_PADRAO] ?? 0;
      return { ...item, necessario, disponivel };
    })
    .filter((item) => item.necessario > item.disponivel);

  function iniciarConfirmacao() {
    const inicial = {};
    Object.keys(selecionados)
      .filter((matricula) => selecionados[matricula])
      .forEach((matricula) => (inicial[matricula] = "pendente"));
    setStatus(inicial);
    setStep("confirmando");
  }

  function confirmarPessoa(matricula) {
    setStatus((atual) => ({ ...atual, [matricula]: "confirmado" }));
  }

  function marcarFalha(matricula) {
    setStatus((atual) => ({ ...atual, [matricula]: "falhou" }));
  }

  const pendentes = Object.values(status).filter((s) => s === "pendente").length;
  const confirmados = Object.entries(status).filter(([, s]) => s === "confirmado");
  const falharam = Object.entries(status).filter(([, s]) => s === "falhou");

  const headers = {
    config: { title: "Entrega de EPI em lote", subtitle: "Prepare a mesma entrega para vários funcionários ou para uma equipe." },
    confirmando: { title: "Confirmação individual", subtitle: "Cada funcionário confirma a própria entrega antes da baixa definitiva." },
    concluida: { title: "Entrega em lote concluída", subtitle: "Comprovantes gerados para os funcionários confirmados." },
  };

  return (
    <AppShell title={headers[step].title} subtitle={headers[step].subtitle} activeSection="Entregas de EPI">
      {step === "config" && (
        <div className="max-w-[1060px] space-y-6">
          <div className="rounded-xl border border-epi-border bg-white p-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-3">
              <label className="block text-[13px] font-medium text-epi-ink">
                Obra
                <select
                  value={obra}
                  onChange={(event) => aplicarFiltro(event.target.value, funcao)}
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                >
                  <option value="">Selecione a obra</option>
                  {OBRAS_COM_EQUIPE.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[13px] font-medium text-epi-ink">
                Equipe / função
                <select
                  value={funcao}
                  onChange={(event) => aplicarFiltro(obra, event.target.value)}
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

          {obra && funcao && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-epi-border bg-white p-6">
                <h3 className="text-sm font-semibold text-epi-ink">1. Selecionar funcionários</h3>
                <div className="mt-3 space-y-2">
                  {funcionariosFiltrados.length === 0 && (
                    <p className="text-sm text-epi-muted">Nenhum funcionário ativo encontrado para esse filtro.</p>
                  )}
                  {funcionariosFiltrados.map((f) => (
                    <label key={f.matricula} className="flex items-center gap-2 text-sm text-epi-ink">
                      <input
                        type="checkbox"
                        checked={Boolean(selecionados[f.matricula])}
                        onChange={() =>
                          setSelecionados((atual) => ({ ...atual, [f.matricula]: !atual[f.matricula] }))
                        }
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
                        <div key={item.ca} className="flex items-center justify-between text-sm">
                          <span className="text-epi-ink">{item.epi}</span>
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
                  <p key={item.ca}>
                    {item.epi}: necessário {item.necessario}, disponível {item.disponivel}
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
              {Object.keys(status).map((matricula) => {
                const f = FUNCIONARIOS.find((fn) => fn.matricula === matricula);
                const s = status[matricula];
                return (
                  <div key={matricula} className="flex items-center justify-between border-b border-epi-border pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-epi-ink">{f.nome}</p>
                      <p className="text-xs text-epi-muted">Matrícula {f.matricula}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s === "pendente" && (
                        <>
                          <button
                            type="button"
                            onClick={() => marcarFalha(matricula)}
                            className="text-sm font-medium text-red-600"
                          >
                            Marcar falha
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarPessoa(matricula)}
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
                            onClick={() => setStatus((atual) => ({ ...atual, [matricula]: "pendente" }))}
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
            {confirmados.map(([matricula]) => {
              const f = FUNCIONARIOS.find((fn) => fn.matricula === matricula);
              return (
                <div key={matricula} className="rounded-lg bg-[#EBF5F0] p-4">
                  <p className="text-sm font-semibold text-epi-ink">{f.nome}</p>
                  <p className="text-xs text-epi-muted">Comprovante nº EPI-2026-{matricula}</p>
                </div>
              );
            })}
            {falharam.map(([matricula]) => {
              const f = FUNCIONARIOS.find((fn) => fn.matricula === matricula);
              return (
                <div key={matricula} className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm font-semibold text-epi-ink">{f.nome}</p>
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
                setObra("");
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
