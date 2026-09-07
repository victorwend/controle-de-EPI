import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { EPIS, ESTOQUE_MINIMO, MATRIZ_POR_FUNCAO } from "../../data/episConfig.js";
import { SALDO_POR_LOCAL } from "../../data/estoqueConfig.js";

const LOCAL_PADRAO = "Almoxarifado Central";

function saldoDe(epiNome) {
  return SALDO_POR_LOCAL[epiNome]?.[LOCAL_PADRAO] ?? 0;
}

// Wizard de entrega individual (03.02 → 03.03 → 03.04), com a confirmação biométrica
// (03.05/03.09–03.12) como um sub-passo interno e o bloqueio por saldo insuficiente
// (05.05) acionado a partir da própria entrega — RN055, ver plano de produção risco 6.
export default function NovaEntrega() {
  const navigate = useNavigate();
  const [step, setStep] = useState("funcionario");

  const [busca, setBusca] = useState("");
  const [funcionario, setFuncionario] = useState(null);

  const [itens, setItens] = useState([]);
  const [buscaEpi, setBuscaEpi] = useState("");
  const [observacao, setObservacao] = useState("");

  const [aceite, setAceite] = useState(false);
  const [bioStep, setBioStep] = useState("aguardando");
  const [bioTentativas, setBioTentativas] = useState(0);
  const [comprovante, setComprovante] = useState("");

  const resultadosFuncionario = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return FUNCIONARIOS.filter((f) => f.nome.toLowerCase().includes(termo) || f.matricula.includes(termo));
  }, [busca]);

  const resultadosEpi = useMemo(() => {
    const termo = buscaEpi.trim().toLowerCase();
    if (!termo) return [];
    return EPIS.filter((e) => e.nome.toLowerCase().includes(termo) && !itens.some((i) => i.epi === e.nome));
  }, [buscaEpi, itens]);

  const totalUnidades = itens.reduce((soma, item) => soma + item.qtd, 0);
  const itensAbaixoMinimo = itens.filter((item) => {
    const minimo = ESTOQUE_MINIMO[item.epi];
    return minimo !== undefined && saldoDe(item.epi) - item.qtd < minimo;
  });
  const itensComProblema = itens.filter((item) => item.qtd > saldoDe(item.epi));

  function selecionarFuncionario(f) {
    setFuncionario(f);
    setBusca(`${f.nome} • Matrícula ${f.matricula}`);
    const matriz = MATRIZ_POR_FUNCAO[f.funcao];
    setItens(matriz ? matriz.map((m) => ({ epi: m.epi, ca: m.ca, qtd: m.quantidade })) : []);
  }

  function adicionarItem(epi) {
    setItens((atual) => [...atual, { epi: epi.nome, ca: epi.ca, qtd: 1 }]);
    setBuscaEpi("");
  }

  function removerItem(epiNome) {
    setItens((atual) => atual.filter((item) => item.epi !== epiNome));
  }

  function alterarQtd(epiNome, qtd) {
    setItens((atual) => atual.map((item) => (item.epi === epiNome ? { ...item, qtd: Math.max(1, qtd) } : item)));
  }

  function revisarEntrega() {
    setStep(itensComProblema.length > 0 ? "bloqueio" : "confirmar");
  }

  function iniciarBiometria() {
    setBioStep("aguardando");
    setBioTentativas(0);
    setStep("biometria");
  }

  function validarBiometria() {
    if (!funcionario.biometriaCadastrada) {
      setBioStep("semBiometria");
      return;
    }
    const proximaTentativa = bioTentativas + 1;
    setBioTentativas(proximaTentativa);
    if (proximaTentativa === 1) setBioStep("naoReconhecida");
    else if (proximaTentativa === 2) setBioStep("leitorDesconectado");
    else setBioStep("confirmada");
  }

  function concluirEntrega() {
    setAceite(true);
    setComprovante(`EPI-2026-${funcionario.matricula}`);
    setStep("concluida");
  }

  function novaEntrega() {
    setStep("funcionario");
    setBusca("");
    setFuncionario(null);
    setItens([]);
    setBuscaEpi("");
    setObservacao("");
    setAceite(false);
    setBioStep("aguardando");
    setBioTentativas(0);
    setComprovante("");
  }

  const headers = {
    funcionario: { title: "Nova entrega de EPI", subtitle: "Registre a entrega e gere o histórico do colaborador." },
    selecionarEpi: { title: "Nova entrega de EPI", subtitle: "Selecione os equipamentos e as quantidades." },
    bloqueio: { title: "Estoque insuficiente", subtitle: "A entrega não pode ser concluída enquanto houver itens sem saldo disponível." },
    confirmar: { title: "Confirmar entrega", subtitle: "Revise os dados antes de concluir a baixa no estoque." },
    biometria: BIO_HEADERS[bioStep],
    concluida: { title: "Entrega concluída", subtitle: "Registro finalizado com sucesso." },
  };

  return (
    <AppShell title={headers[step].title} subtitle={headers[step].subtitle} activeSection="Entregas de EPI">
      {step !== "concluida" && step !== "biometria" && (
        <div className="mb-6 flex max-w-[1060px] gap-2">
          {["funcionario", "selecionarEpi", "confirmar"].map((s, i) => (
            <span
              key={s}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                step === s ? "bg-[#EBF5F0] text-epi-brand" : "text-epi-muted"
              }`}
            >
              {i + 1}. {STEP_LABELS[s]}
            </span>
          ))}
        </div>
      )}

      {step === "funcionario" && (
        <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-epi-border bg-white p-8">
            <h2 className="text-lg font-semibold text-epi-ink">Selecionar funcionário</h2>

            <label className="mt-4 block text-[13px] font-medium text-epi-ink">
              Funcionário *
              <input
                type="text"
                value={busca}
                onChange={(event) => {
                  setBusca(event.target.value);
                  setFuncionario(null);
                }}
                placeholder="Buscar por nome ou matrícula..."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
              {resultadosFuncionario.length > 0 && !funcionario && (
                <div className="mt-2 overflow-hidden rounded-lg border border-epi-border">
                  {resultadosFuncionario.map((f) => (
                    <button
                      type="button"
                      key={f.matricula}
                      onClick={() => selecionarFuncionario(f)}
                      className="block w-full px-3 py-2 text-left text-sm text-epi-ink hover:bg-epi-paper"
                    >
                      {f.nome} • Matrícula {f.matricula} • {f.obra}
                    </button>
                  ))}
                </div>
              )}
            </label>

            {funcionario && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Obra atual" value={funcionario.obra} />
                  <ReadOnlyField label="Função" value={funcionario.funcao} />
                </div>

                <div className="mt-4 rounded-lg border border-epi-border p-4">
                  <p className="text-sm font-semibold text-epi-ink">
                    {funcionario.nome} • Matrícula {funcionario.matricula}
                  </p>
                  <p className="mt-1 text-xs text-epi-muted">
                    {funcionario.episAtivos} EPIs ativos • {funcionario.pendencias} pendências
                  </p>
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!funcionario}
                onClick={() => setStep("selecionarEpi")}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          </div>

          <ResumoEntrega funcionario={funcionario} itens={itens} totalUnidades={totalUnidades} />
        </div>
      )}

      {step === "selecionarEpi" && funcionario && (
        <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-epi-border bg-white p-8">
            <h2 className="text-lg font-semibold text-epi-ink">Adicionar EPI</h2>

            <label className="mt-4 block text-[13px] font-medium text-epi-ink">
              Buscar equipamento...
              <input
                type="text"
                value={buscaEpi}
                onChange={(event) => setBuscaEpi(event.target.value)}
                placeholder="Buscar equipamento..."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
              {resultadosEpi.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-lg border border-epi-border">
                  {resultadosEpi.map((epi) => (
                    <button
                      type="button"
                      key={epi.ca}
                      onClick={() => adicionarItem(epi)}
                      className="block w-full px-3 py-2 text-left text-sm text-epi-ink hover:bg-epi-paper"
                    >
                      + {epi.nome} • CA {epi.ca}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <div className="mt-4 overflow-hidden rounded-lg border border-epi-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="px-4 py-3 font-medium">EPI</th>
                    <th className="px-4 py-3 font-medium">CA</th>
                    <th className="px-4 py-3 font-medium">Qtd.</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.epi} className="border-b border-epi-border last:border-0">
                      <td className="px-4 py-3 font-medium text-epi-ink">{item.epi}</td>
                      <td className="px-4 py-3 text-epi-muted">{item.ca}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          value={item.qtd}
                          onChange={(event) => alterarQtd(item.epi, Number(event.target.value))}
                          className="h-8 w-16 rounded border border-epi-border px-2 text-sm"
                        />
                      </td>
                      <td className={`px-4 py-3 ${item.qtd > saldoDe(item.epi) ? "font-medium text-red-600" : "text-epi-muted"}`}>
                        {saldoDe(item.epi)}
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => removerItem(item.epi)} className="text-sm font-medium text-red-600">
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {itens.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-epi-muted">
                        Nenhum item adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <label className="mt-4 block text-[13px] font-medium text-epi-ink">
              Observação
              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                rows={2}
                placeholder="Opcional: informe motivo, troca, saldo ou outras observações"
                className="mt-2 w-full rounded-lg border border-epi-border px-3 py-2 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("funcionario")}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                ← Voltar
              </button>
              <button
                type="button"
                disabled={itens.length === 0}
                onClick={revisarEntrega}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Revisar entrega →
              </button>
            </div>
          </div>

          <ResumoEntrega funcionario={funcionario} itens={itens} totalUnidades={totalUnidades} itensAbaixoMinimo={itensAbaixoMinimo} />
        </div>
      )}

      {step === "bloqueio" && (
        <div className="max-w-[1060px] space-y-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">Entrega bloqueada</p>
            <p className="mt-1 text-sm text-red-700/80">Existem EPIs com quantidade solicitada maior que o saldo disponível.</p>
            <p className="mt-1 text-sm text-red-700/60">Ajuste a entrega ou solicite reposição antes de continuar.</p>
          </div>

          <div className="rounded-xl border border-epi-border bg-white p-6">
            <h3 className="text-base font-semibold text-epi-ink">Itens com problema</h3>
            <div className="mt-4 space-y-4">
              {itensComProblema.map((item) => (
                <div key={item.epi} className="flex items-center justify-between border-b border-epi-border pb-4 last:border-0">
                  <p className="font-medium text-epi-ink">{item.epi}</p>
                  <div className="flex items-center gap-6 text-sm text-epi-muted">
                    <span>Solicitado: {item.qtd}</span>
                    <span>Disponível: {saldoDe(item.epi)}</span>
                    <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      Saldo insuficiente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-700">Concluir entrega permanece bloqueado.</p>
            <p className="mt-1 text-sm text-amber-700/80">Libere o fluxo somente quando todos os itens tiverem saldo suficiente.</p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep("selecionarEpi")}
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Ajustar entrega
            </button>
            <button
              type="button"
              onClick={() => navigate("/estoque/entrada")}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Solicitar reposição
            </button>
          </div>
        </div>
      )}

      {step === "confirmar" && funcionario && (
        <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-epi-border bg-white p-8">
            <p className="text-xs font-medium uppercase text-epi-muted">Colaborador</p>
            <p className="mt-1 text-base font-semibold text-epi-ink">
              {funcionario.nome} • Matrícula {funcionario.matricula}
            </p>
            <p className="mt-3 text-xs font-medium uppercase text-epi-muted">Obra</p>
            <p className="mt-1 text-sm text-epi-ink">{funcionario.obra}</p>

            <p className="mt-5 text-xs font-medium uppercase text-epi-muted">Itens da entrega</p>
            <div className="mt-2 divide-y divide-epi-border">
              {itens.map((item) => (
                <div key={item.epi} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-epi-ink">{item.epi}</span>
                  <span className="text-epi-muted">CA {item.ca}</span>
                  <span className="text-epi-ink">{item.qtd} un.</span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-epi-border pt-6">
              <p className="text-sm font-semibold text-epi-ink">Confirmação do colaborador</p>
              {aceite ? (
                <p className="mt-2 inline-block rounded-md bg-[#EBF5F0] px-3 py-1.5 text-sm font-medium text-epi-brand">
                  ✓ Aceite registrado
                </p>
              ) : (
                <p className="mt-2 text-sm text-epi-muted">Biometria • usar leitor biométrico do posto</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("selecionarEpi")}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                ← Voltar
              </button>
              {aceite ? (
                <button
                  type="button"
                  onClick={concluirEntrega}
                  className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Concluir entrega
                </button>
              ) : (
                <button
                  type="button"
                  onClick={iniciarBiometria}
                  className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Confirmar com biometria
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-epi-border bg-white p-6">
            <h3 className="text-sm font-semibold text-epi-ink">Impacto no estoque</h3>
            <div className="mt-3 space-y-2 text-sm">
              {itens.map((item) => (
                <div key={item.epi} className="flex items-center justify-between">
                  <span className="text-epi-ink">{item.epi}</span>
                  <span className={itensAbaixoMinimo.some((i) => i.epi === item.epi) ? "font-medium text-orange-600" : "text-epi-muted"}>
                    {saldoDe(item.epi)} → {saldoDe(item.epi) - item.qtd}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium uppercase text-epi-muted">Após concluir</p>
            <ul className="mt-2 space-y-1 text-sm text-epi-muted">
              <li>• Atualiza o estoque</li>
              <li>• Salva no histórico</li>
              <li>• Atualiza ficha de EPI</li>
              <li>• Gera comprovante</li>
            </ul>
          </div>
        </div>
      )}

      {step === "biometria" && funcionario && (
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
          <h2 className="text-lg font-semibold text-epi-ink">{BIO_TITLES[bioStep]}</h2>
          <p className="mt-1 text-sm text-epi-muted">
            {funcionario.nome} • Matrícula {funcionario.matricula}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center rounded-lg bg-[#EBF5F0] p-8 text-center">
              <p className="text-sm font-semibold text-epi-ink">Leitor biométrico</p>
              <div className="mt-4 flex h-28 w-28 items-center justify-center rounded-full border-2 border-epi-brand text-xs font-medium text-epi-brand">
                ENCOSTE
                <br />O DEDO
              </div>
              <p className="mt-4 text-sm text-epi-muted">
                {bioStep === "confirmada" ? "Leitura confirmada" : "Aguardando leitura..."}
              </p>
            </div>

            <div className="rounded-lg border border-epi-border p-5">
              <p className="text-sm font-semibold text-epi-ink">Dados da confirmação</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase text-epi-muted">Método</dt>
                  <dd className="font-medium text-epi-ink">Biometria digital</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-epi-muted">Entrega</dt>
                  <dd className="text-epi-ink">
                    {itens.length} EPIs • {totalUnidades} unidades
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-epi-muted">Obra</dt>
                  <dd className="text-epi-ink">{funcionario.obra}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-epi-muted">Registro</dt>
                  <dd className="text-epi-ink">Data, hora, usuário e dispositivo</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Privacidade e segurança</p>
            <p className="mt-1 text-amber-800/80">
              O sistema deve registrar o resultado da validação, não uma imagem da digital. O armazenamento e o tratamento da biometria
              devem seguir as regras de proteção de dados definidas pela empresa (ver RN030 e RN031).
            </p>
          </div>

          <p className="mt-4 inline-block rounded-md bg-epi-paper px-3 py-1.5 text-xs font-medium text-epi-muted">
            Status: {BIO_STATUS[bioStep]}
          </p>

          <div className="mt-6 flex items-center justify-between">
            {bioStep === "aguardando" && (
              <button
                type="button"
                onClick={() => setStep("confirmar")}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                ← Voltar
              </button>
            )}
            {bioStep === "semBiometria" && (
              <button
                type="button"
                onClick={() =>
                  navigate("/cadastros/biometria", {
                    state: { origem: "entrega", funcionario: { nome: funcionario.nome, matricula: funcionario.matricula, obra: funcionario.obra } },
                  })
                }
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Cadastrar biometria
              </button>
            )}
            {(bioStep === "naoReconhecida" || bioStep === "leitorDesconectado") && (
              <button
                type="button"
                onClick={validarBiometria}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Tentar novamente
              </button>
            )}
            {bioStep === "confirmada" && (
              <button
                type="button"
                onClick={concluirEntrega}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Concluir entrega
              </button>
            )}

            <button
              type="button"
              disabled={bioStep !== "aguardando"}
              onClick={validarBiometria}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Validar biometria e concluir
            </button>
          </div>
        </div>
      )}

      {step === "concluida" && funcionario && (
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF5F0] text-lg text-epi-brand">✓</div>
          <h2 className="mt-4 text-xl font-semibold text-epi-ink">Entrega registrada com sucesso</h2>
          <p className="mt-1 text-sm text-epi-muted">A baixa no estoque e o histórico do colaborador foram atualizados.</p>

          <div className="mx-auto mt-6 max-w-[420px] rounded-lg bg-[#EBF5F0] p-5 text-left">
            <p className="font-semibold text-epi-ink">{funcionario.nome}</p>
            <p className="mt-1 text-sm text-epi-muted">
              {itens.length} tipos de EPI • {funcionario.obra} • {new Date().toLocaleDateString("pt-BR")}
            </p>
            <p className="mt-1 text-sm text-epi-muted">Comprovante nº {comprovante}</p>
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
              onClick={novaEntrega}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Nova entrega
            </button>
            <button
              type="button"
              onClick={() => navigate(`/funcionarios/${funcionario.matricula}`)}
              className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Abrir ficha
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const STEP_LABELS = { funcionario: "Funcionário", selecionarEpi: "EPI e quantidade", confirmar: "Confirmação" };

const BIO_HEADERS = {
  aguardando: { title: "Confirmação biométrica da entrega", subtitle: "Valide a identidade do colaborador antes de concluir a baixa do EPI." },
  semBiometria: { title: "Este colaborador ainda não possui biometria cadastrada.", subtitle: "Valide a identidade do colaborador antes de concluir a baixa do EPI." },
  naoReconhecida: { title: "A leitura não corresponde à biometria cadastrada do colaborador.", subtitle: "Valide a identidade do colaborador antes de concluir a baixa do EPI." },
  leitorDesconectado: { title: "Não foi possível localizar o leitor biométrico do posto.", subtitle: "Valide a identidade do colaborador antes de concluir a baixa do EPI." },
  confirmada: { title: "Identidade validada com sucesso. A entrega pode ser concluída.", subtitle: "Valide a identidade do colaborador antes de concluir a baixa do EPI." },
};

const BIO_TITLES = {
  aguardando: "Biometria do colaborador",
  semBiometria: "Biometria não cadastrada",
  naoReconhecida: "Biometria não reconhecida",
  leitorDesconectado: "Leitor biométrico desconectado",
  confirmada: "Biometria confirmada",
};

const BIO_STATUS = {
  aguardando: "aguardando leitura",
  semBiometria: "cadastro biométrico necessário",
  naoReconhecida: "leitura não validada",
  leitorDesconectado: "dispositivo não conectado",
  confirmada: "colaborador autenticado",
};

function ReadOnlyField({ label, value }) {
  return (
    <label className="block text-[13px] font-medium text-epi-ink">
      {label}
      <input
        type="text"
        readOnly
        value={value}
        className="mt-2 h-11 w-full rounded-lg border border-epi-border bg-epi-paper px-3 text-sm text-epi-muted"
      />
    </label>
  );
}

function ResumoEntrega({ funcionario, itens, totalUnidades, itensAbaixoMinimo = [] }) {
  return (
    <aside className="h-fit rounded-xl border border-epi-border bg-white p-6">
      <h3 className="text-sm font-semibold text-epi-ink">Resumo da entrega</h3>
      {funcionario ? (
        <>
          <p className="mt-3 text-xs uppercase text-epi-muted">Funcionário</p>
          <p className="text-sm font-medium text-epi-ink">{funcionario.nome}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">Obra</p>
          <p className="text-sm text-epi-ink">{funcionario.obra}</p>
          <p className="mt-3 text-xs uppercase text-epi-muted">EPIs selecionados</p>
          {itens.length === 0 ? (
            <p className="text-sm text-epi-muted">Nenhum item selecionado</p>
          ) : (
            <>
              <p className="text-sm text-epi-ink">{itens.length} tipos de EPI selecionados</p>
              <p className="text-sm text-epi-ink">{totalUnidades} unidades no total</p>
            </>
          )}
          {itensAbaixoMinimo.length > 0 && (
            <div className="mt-4 rounded-lg bg-orange-50 p-3">
              <p className="text-xs font-semibold text-orange-700">Atenção</p>
              {itensAbaixoMinimo.map((item) => (
                <p key={item.epi} className="mt-1 text-xs text-orange-700/80">
                  {item.epi} ficará abaixo do estoque mínimo após a entrega.
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-epi-muted">Selecione um funcionário para começar.</p>
      )}
    </aside>
  );
}
