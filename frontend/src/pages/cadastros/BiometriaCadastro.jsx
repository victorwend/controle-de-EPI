import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";

// Unifica os dois pontos de entrada do cadastro biométrico vistos no Figma:
// busca dedicada (09.10, a partir do hub de Cadastros) e o atalho embutido em
// "Novo funcionário" (04.02), que já chega com o funcionário conhecido e pula
// direto para a captura. Ver docs/05-arquitetura/plano-de-producao-telas.md,
// risco 3 - essa unificação é a decisão de arquitetura que estava pendente.
export default function BiometriaCadastro() {
  const location = useLocation();
  const navigate = useNavigate();
  const funcionarioPreSelecionado = location.state?.funcionario ?? null;
  const origem = location.state?.origem ?? "cadastros";

  const [step, setStep] = useState(funcionarioPreSelecionado ? "captura" : "busca");
  const [busca, setBusca] = useState("");
  const [funcionario, setFuncionario] = useState(funcionarioPreSelecionado);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return FUNCIONARIOS.filter(
      (f) => f.nome.toLowerCase().includes(termo) || f.matricula.includes(termo)
    );
  }, [busca]);

  function voltarAoInicio() {
    navigate(origem === "novo-funcionario" ? "/funcionarios/novo" : "/cadastros");
  }

  return (
    <AppShell title={HEADERS[step].title} subtitle={HEADERS[step].subtitle} activeSection="Cadastros">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10">
        {step === "busca" && (
          <>
            <h2 className="text-xl font-semibold text-epi-ink">Cadastrar biometria</h2>
            <p className="mt-1 text-sm text-epi-muted">Procure pelo funcionário e confirme os dados antes da captura.</p>

            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
                Buscar funcionário
                <input
                  type="text"
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setFuncionario(null);
                  }}
                  placeholder="Digite nome, matrícula ou CPF"
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
                {resultados.length > 0 && !funcionario && (
                  <div className="mt-2 overflow-hidden rounded-lg border border-epi-border">
                    {resultados.map((f) => (
                      <button
                        type="button"
                        key={f.matricula}
                        onClick={() => {
                          setFuncionario(f);
                          setBusca(`${f.nome} • Matrícula ${f.matricula} • Obra ${f.obra}`);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-epi-ink hover:bg-epi-paper"
                      >
                        {f.nome} • Matrícula {f.matricula} • Obra {f.obra}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
                Funcionário selecionado
                <input
                  type="text"
                  readOnly
                  value={funcionario ? `${funcionario.nome} • Matrícula ${funcionario.matricula} • Obra ${funcionario.obra}` : ""}
                  placeholder="Nenhum funcionário selecionado"
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border bg-epi-paper px-3 text-sm text-epi-ink placeholder:text-epi-muted"
                />
              </label>

              <label className="block text-[13px] font-medium text-epi-ink">
                Status da biometria
                <input
                  type="text"
                  readOnly
                  value="Não cadastrada"
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border bg-epi-paper px-3 text-sm text-epi-muted"
                />
              </label>

              <label className="block text-[13px] font-medium text-epi-ink">
                Situação
                <input
                  type="text"
                  readOnly
                  value={funcionario ? "Pronto para cadastro" : "Selecione um funcionário"}
                  className="mt-2 h-11 w-full rounded-lg border border-epi-border bg-epi-paper px-3 text-sm text-epi-muted"
                />
              </label>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/cadastros")}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!funcionario}
                onClick={() => setStep("captura")}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
              >
                Iniciar cadastro
              </button>
            </div>
          </>
        )}

        {step === "captura" && funcionario && (
          <>
            <h2 className="text-xl font-semibold text-epi-ink">Captura biométrica</h2>
            <p className="mt-1 text-sm text-epi-muted">Utilize o leitor biométrico conectado ao posto.</p>

            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <ReadOnlyField label="Funcionário" value={funcionario.nome} />
              <ReadOnlyField label="Matrícula" value={funcionario.matricula} />
              <ReadOnlyField label="Leitor biométrico" value="Leitor conectado" />
              <ReadOnlyField label="Status" value="Aguardando leitura..." />
              <ReadOnlyField
                label="Orientação"
                value="Posicione o dedo no leitor e aguarde a confirmação da captura."
                full
              />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (funcionarioPreSelecionado ? voltarAoInicio() : setStep("busca"))}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep("confirmar")}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Capturar biometria
              </button>
            </div>
          </>
        )}

        {step === "confirmar" && funcionario && (
          <>
            <h2 className="text-xl font-semibold text-epi-ink">Confirmar cadastro biométrico</h2>
            <p className="mt-1 text-sm text-epi-muted">A leitura foi capturada com sucesso.</p>

            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <ReadOnlyField label="Funcionário" value={funcionario.nome} />
              <ReadOnlyField label="Matrícula" value={funcionario.matricula} />
              <ReadOnlyField label="Leitura biométrica" value="Capturada com sucesso" />
              <ReadOnlyField label="Status" value="Pronta para vincular" />
              <ReadOnlyField label="Registro" value="O cadastro ficará vinculado ao funcionário selecionado." full />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("captura")}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep("sucesso")}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Confirmar cadastro
              </button>
            </div>
          </>
        )}

        {step === "sucesso" && funcionario && (
          <>
            <h2 className="text-xl font-semibold text-epi-ink">Biometria cadastrada com sucesso</h2>
            <p className="mt-1 text-sm text-epi-muted">O funcionário já pode utilizar a biometria nas confirmações de entrega.</p>

            <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
              <ReadOnlyField label="Funcionário" value={funcionario.nome} />
              <ReadOnlyField label="Matrícula" value={funcionario.matricula} />
              <ReadOnlyField label="Status da biometria" value="Cadastrada e ativa" />
              <ReadOnlyField label="Cadastro" value="Concluído" />
              <ReadOnlyField
                label="Próxima ação"
                value="Volte aos cadastros ou cadastre a biometria de outro funcionário."
                full
              />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={voltarAoInicio}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                {origem === "novo-funcionario" ? "Voltar ao cadastro do funcionário" : "Voltar aos cadastros"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFuncionario(null);
                  setBusca("");
                  setStep("busca");
                }}
                className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Cadastrar outro
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

const HEADERS = {
  busca: { title: "Cadastrar biometria", subtitle: "Selecione o funcionário para iniciar o cadastro biométrico." },
  captura: { title: "Cadastrar biometria", subtitle: "Capture a digital do funcionário selecionado." },
  confirmar: { title: "Confirmar cadastro biométrico", subtitle: "Revise os dados antes de vincular a biometria ao funcionário." },
  sucesso: { title: "Biometria cadastrada", subtitle: "Cadastro biométrico concluído com sucesso." },
};

function ReadOnlyField({ label, value, full }) {
  return (
    <label className={`block text-[13px] font-medium text-epi-ink ${full ? "md:col-span-2" : ""}`}>
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
