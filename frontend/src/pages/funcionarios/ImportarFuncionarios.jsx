import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import { analisarPlanilha, emLotes } from "../../lib/importacaoFuncionarios";
import { baixarModeloFuncionarios, lerPlanilhaFuncionarios } from "../../lib/planilha";

// Importação de funcionários em massa por planilha Excel (EPI-319).
// Fluxo: 1) baixar modelo  2) enviar planilha  3) conferir  4) cadastrar.

const TAMANHO_LOTE = 500;
const TAMANHO_PAGINA = 1000; // o Supabase devolve no máximo 1000 linhas por consulta

async function buscarMatriculasExistentes() {
  const matriculas = new Set();
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await supabase
      .from("funcionarios")
      .select("matricula")
      .order("matricula")
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    for (const linha of data ?? []) matriculas.add(linha.matricula);
    if (!data || data.length < TAMANHO_PAGINA) break;
  }
  return matriculas;
}

function Contador({ titulo, valor, cor }) {
  return (
    <div className={`rounded-xl border p-4 ${cor}`}>
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide">{titulo}</p>
    </div>
  );
}

export default function ImportarFuncionarios() {
  const { usuario } = useAuth();
  const ehAdministrador = usuario?.perfil === "administrador";

  const [obras, setObras] = useState([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [analise, setAnalise] = useState(null);
  const [lendo, setLendo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(null);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("obras")
      .select("id, nome, codigo")
      .order("nome")
      .then(({ data }) => {
        if (ativo) setObras(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, []);

  function recomecar() {
    setNomeArquivo("");
    setAnalise(null);
    setErro("");
    setConcluido(null);
  }

  async function handleArquivo(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;

    recomecar();
    setNomeArquivo(arquivo.name);
    setLendo(true);

    try {
      const [matriz, matriculasExistentes] = await Promise.all([
        lerPlanilhaFuncionarios(arquivo),
        buscarMatriculasExistentes(),
      ]);
      const resultado = analisarPlanilha(matriz, { obras, matriculasExistentes });
      if (resultado.erroGeral) setErro(resultado.erroGeral);
      else setAnalise(resultado);
    } catch (falha) {
      setErro(falha?.message || "Não foi possível ler a planilha.");
    } finally {
      setLendo(false);
    }
  }

  async function handleConfirmar() {
    if (!analise || analise.novos.length === 0) return;
    setGravando(true);
    setErro("");

    let gravados = 0;
    let ignoradosNoBanco = 0;

    for (const lote of emLotes(analise.novos, TAMANHO_LOTE)) {
      const registros = lote.map((item) => ({ ...item.registro, empresa_id: usuario.empresa_id }));

      // ignoreDuplicates: se alguém cadastrou a mesma matrícula enquanto a
      // planilha era conferida, o banco simplesmente pula essa linha.
      const { data, error } = await supabase
        .from("funcionarios")
        .upsert(registros, { onConflict: "empresa_id,matricula", ignoreDuplicates: true })
        .select("matricula");

      if (error) {
        setGravando(false);
        setErro(
          `${gravados} funcionário(s) foram cadastrados, mas um lote falhou: ${error.message}. ` +
            "Envie a mesma planilha de novo: quem já entrou será ignorado."
        );
        return;
      }

      const inseridos = data?.length ?? 0;
      gravados += inseridos;
      ignoradosNoBanco += registros.length - inseridos;
    }

    setGravando(false);
    setConcluido({ gravados, ignoradosNoBanco });
    setAnalise(null);
  }

  const ignorados = analise ? analise.jaCadastrados.length + analise.repetidos.length : 0;

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Importar funcionários por planilha</h2>
        <p className="mt-1 text-sm text-epi-muted">
          Cadastre vários funcionários de uma vez. Quem já está cadastrado (mesma matrícula) é ignorado.
        </p>
      </div>

      {!ehAdministrador && (
        <p className="mb-6 max-w-[1060px] rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Só o Administrador pode cadastrar funcionários. Você pode baixar o modelo e conferir a planilha,
          mas não vai conseguir gravar.
        </p>
      )}

      <div className="grid max-w-[1060px] grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-epi-border bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-epi-muted">Passo 1</p>
          <h3 className="mt-1 text-base font-semibold text-epi-ink">Baixe a planilha-modelo</h3>
          <p className="mt-2 text-sm text-epi-muted">
            Ela já vem com as colunas certas, a lista das suas obras e as instruções de preenchimento.
          </p>
          <button
            type="button"
            onClick={() => baixarModeloFuncionarios(obras)}
            className="mt-4 rounded-lg border border-epi-brand px-4 py-2.5 text-sm font-semibold text-epi-brand hover:bg-epi-paper"
          >
            Baixar modelo (.xlsx)
          </button>
        </section>

        <section className="rounded-xl border border-epi-border bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-epi-muted">Passo 2</p>
          <h3 className="mt-1 text-base font-semibold text-epi-ink">Envie a planilha preenchida</h3>
          <p className="mt-2 text-sm text-epi-muted">
            Nada é gravado agora: primeiro você confere o resultado.
          </p>
          <label className="mt-4 inline-block cursor-pointer rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            {lendo ? "Lendo planilha..." : "Escolher arquivo"}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleArquivo}
              disabled={lendo || gravando}
              className="sr-only"
            />
          </label>
          {nomeArquivo && <p className="mt-2 text-xs text-epi-muted">Arquivo: {nomeArquivo}</p>}
        </section>
      </div>

      {erro && (
        <p className="mt-6 max-w-[1060px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
      )}

      {concluido && (
        <div className="mt-6 max-w-[1060px] rounded-xl bg-green-50 p-6 text-green-800">
          <p className="text-base font-semibold">
            {concluido.gravados} funcionário(s) cadastrado(s) com sucesso.
          </p>
          {concluido.ignoradosNoBanco > 0 && (
            <p className="mt-1 text-sm">
              {concluido.ignoradosNoBanco} foram ignorados porque alguém cadastrou a mesma matrícula enquanto você conferia.
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <Link to="/funcionarios" className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white">
              Ver funcionários
            </Link>
            <button type="button" onClick={recomecar} className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-semibold text-epi-ink">
              Importar outra planilha
            </button>
          </div>
        </div>
      )}

      {analise && (
        <section className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-epi-muted">Passo 3</p>
          <h3 className="mt-1 text-base font-semibold text-epi-ink">Confira antes de cadastrar</h3>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Contador titulo="Serão cadastrados" valor={analise.novos.length} cor="border-green-200 bg-green-50 text-green-800" />
            <Contador titulo="Ignorados (já existem)" valor={ignorados} cor="border-epi-border bg-epi-paper text-epi-ink" />
            <Contador titulo="Com erro (não entram)" valor={analise.comErro.length} cor="border-red-200 bg-red-50 text-red-700" />
          </div>

          {analise.comErro.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-red-700">Linhas com erro — corrija na planilha e envie de novo</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-epi-muted">
                    <tr>
                      <th className="py-2 pr-4">Linha</th>
                      <th className="py-2 pr-4">Matrícula</th>
                      <th className="py-2 pr-4">Nome</th>
                      <th className="py-2">O que corrigir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analise.comErro.map((item) => (
                      <tr key={`erro-${item.linha}`} className="border-t border-epi-border align-top">
                        <td className="py-2 pr-4">{item.linha}</td>
                        <td className="py-2 pr-4">{item.matricula || "—"}</td>
                        <td className="py-2 pr-4">{item.nome || "—"}</td>
                        <td className="py-2 text-red-700">{item.motivos.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {ignorados > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-epi-ink">
                Ver os {ignorados} ignorados
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-epi-muted">
                {analise.jaCadastrados.map((item) => (
                  <li key={`ja-${item.linha}`}>
                    Linha {item.linha}: matrícula {item.matricula} ({item.nome || "sem nome"}) já está cadastrada.
                  </li>
                ))}
                {analise.repetidos.map((item) => (
                  <li key={`rep-${item.linha}`}>
                    Linha {item.linha}: matrícula {item.matricula} repetida (já aparece na linha {item.primeiraLinha}).
                  </li>
                ))}
              </ul>
            </details>
          )}

          {analise.novos.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-epi-ink">
                Ver os {analise.novos.length} que serão cadastrados
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-epi-muted">
                {analise.novos.map((item) => (
                  <li key={`novo-${item.linha}`}>
                    {item.matricula} — {item.nome} ({item.obraNome})
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-epi-border pt-6">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={gravando || analise.novos.length === 0 || !ehAdministrador}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {gravando ? "Cadastrando..." : `Cadastrar ${analise.novos.length} funcionário(s)`}
            </button>
            <button
              type="button"
              onClick={recomecar}
              disabled={gravando}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-semibold text-epi-ink"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      <p className="mt-6 text-sm">
        <Link to="/funcionarios" className="font-semibold text-epi-brand">
          ← Voltar para funcionários
        </Link>
      </p>
    </AppShell>
  );
}
