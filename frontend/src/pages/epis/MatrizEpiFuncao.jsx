import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  deBanco,
  normalizarNomeFuncao,
  paraSalvar,
  textoPeriodicidade,
  validarItensMatriz,
  validarNomeFuncao,
} from "../../lib/matriz.js";
import SePuder from "../../components/SePuder.jsx";

// Matriz EPI x Função com dados reais (EPI-280).
//
// 1) Funções: criar, renomear, inativar/reativar e excluir (só se nenhum
//    funcionário usar). Tabela "funcoes" (correção 21).
// 2) Matriz da função escolhida: quais EPIs, quantos, obrigatório ou
//    recomendado e troca a cada quantos meses. Salva tudo de uma vez pela
//    função salvar_matriz_funcao.
// A matriz é usada para SUGERIR os EPIs na Nova entrega e na Entrega em lote.
// Quem pode alterar: permissão "EPIs, CAs e matriz" (Usuários e permissões).

const CAMPO =
  "h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand disabled:bg-epi-paper";

export default function MatrizEpiFuncao() {
  const { pode, usuario } = useAuth();
  const podeEditar = pode("gerenciar_epis");

  const [funcoes, setFuncoes] = useState([]);
  const [epis, setEpis] = useState([]);
  const [usoPorFuncao, setUsoPorFuncao] = useState({});
  const [funcaoId, setFuncaoId] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);

  const [itens, setItens] = useState([]);
  const [itensSalvos, setItensSalvos] = useState("[]");
  const [carregandoMatriz, setCarregandoMatriz] = useState(false);

  const [novaFuncao, setNovaFuncao] = useState("");
  const [renomeando, setRenomeando] = useState(false);
  const [nomeEditado, setNomeEditado] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function carregarFuncoes(selecionarId) {
    const [{ data: funcoesData }, { data: episData }, { data: funcionariosData }] = await Promise.all([
      supabase.from("funcoes").select("id, nome, status").order("nome"),
      supabase.from("epis").select("id, nome, ca").order("nome"),
      supabase.from("funcionarios").select("funcao_id").not("funcao_id", "is", null),
    ]);
    const uso = {};
    for (const linha of funcionariosData ?? []) uso[linha.funcao_id] = (uso[linha.funcao_id] ?? 0) + 1;

    setFuncoes(funcoesData ?? []);
    setEpis(episData ?? []);
    setUsoPorFuncao(uso);

    const ativas = (funcoesData ?? []).filter((funcao) => funcao.status === "ativa");
    const alvo = selecionarId === undefined ? funcaoId : selecionarId;
    if (alvo && (funcoesData ?? []).some((funcao) => funcao.id === alvo)) setFuncaoId(alvo);
    else setFuncaoId(ativas[0]?.id ?? "");
  }

  useEffect(() => {
    carregarFuncoes();
  }, []);

  // Ao trocar de função, carrega a matriz dela.
  useEffect(() => {
    let ativo = true;
    setRenomeando(false);
    if (!funcaoId) {
      setItens([]);
      setItensSalvos("[]");
      return undefined;
    }
    setCarregandoMatriz(true);
    supabase
      .from("matriz_epi_funcao")
      .select("epi_id, quantidade, obrigatorio, periodicidade_meses")
      .eq("funcao_id", funcaoId)
      .then(({ data }) => {
        if (!ativo) return;
        const lista = deBanco(data);
        setItens(lista);
        setItensSalvos(JSON.stringify(lista));
        setCarregandoMatriz(false);
      });
    return () => {
      ativo = false;
    };
  }, [funcaoId]);

  const funcaoAtual = funcoes.find((funcao) => funcao.id === funcaoId);
  const funcoesVisiveis = funcoes.filter((funcao) => mostrarInativas || funcao.status === "ativa" || funcao.id === funcaoId);
  const quantidadeInativas = funcoes.filter((funcao) => funcao.status !== "ativa").length;
  const alterado = JSON.stringify(itens) !== itensSalvos;
  const episPorId = useMemo(() => Object.fromEntries(epis.map((epi) => [epi.id, epi])), [epis]);
  const usados = new Set(itens.map((item) => item.epiId));

  function limparMensagens() {
    setErro("");
    setAviso("");
  }

  // ----- Funções -----
  async function criarFuncao(event) {
    event.preventDefault();
    limparMensagens();
    const mensagem = validarNomeFuncao(funcoes, novaFuncao);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    const { data, error } = await supabase
      .from("funcoes")
      .insert({ nome: normalizarNomeFuncao(novaFuncao), empresa_id: usuario?.empresa_id })
      .select("id")
      .single();
    if (error) {
      setErro(error.code === "23505" ? "Já existe uma função com esse nome." : error.message);
      return;
    }
    setNovaFuncao("");
    setAviso("Função criada. Agora adicione os EPIs dela.");
    await carregarFuncoes(data.id);
  }

  async function renomearFuncao() {
    limparMensagens();
    const mensagem = validarNomeFuncao(funcoes, nomeEditado, funcaoId);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    const { error } = await supabase.from("funcoes").update({ nome: normalizarNomeFuncao(nomeEditado) }).eq("id", funcaoId);
    if (error) {
      setErro(error.code === "23505" ? "Já existe uma função com esse nome." : error.message);
      return;
    }
    setRenomeando(false);
    setAviso("Função renomeada. Os funcionários dela já mostram o nome novo.");
    await carregarFuncoes(funcaoId);
  }

  async function alterarStatusFuncao() {
    limparMensagens();
    const novo = funcaoAtual.status === "ativa" ? "inativa" : "ativa";
    const { error } = await supabase.from("funcoes").update({ status: novo }).eq("id", funcaoId);
    if (error) {
      setErro(error.message);
      return;
    }
    setAviso(novo === "inativa" ? "Função inativada: ela não aparece mais na entrega em lote." : "Função reativada.");
    await carregarFuncoes(funcaoId);
  }

  async function excluirFuncao() {
    limparMensagens();
    const { error } = await supabase.from("funcoes").delete().eq("id", funcaoId);
    if (error) {
      setErro(
        error.code === "23503"
          ? "Esta função tem funcionários. Ela não pode ser excluída, mas pode ser inativada."
          : error.message
      );
      return;
    }
    setAviso("Função excluída.");
    await carregarFuncoes(null);
  }

  // ----- Itens da matriz -----
  function adicionarItem() {
    limparMensagens();
    setItens((atual) => [...atual, { epiId: "", quantidade: 1, obrigatorio: true, periodicidadeMeses: "" }]);
  }

  function alterarItem(indice, campo, valor) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(indice) {
    setItens((atual) => atual.filter((_, i) => i !== indice));
  }

  async function salvarMatriz() {
    limparMensagens();
    const mensagem = validarItensMatriz(itens);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("salvar_matriz_funcao", {
      p_funcao_id: funcaoId,
      p_itens: paraSalvar(itens),
    });
    setSalvando(false);
    if (error) {
      setErro(error.message || "Não foi possível salvar a matriz.");
      return;
    }
    setItensSalvos(JSON.stringify(itens));
    setAviso(`Matriz de "${funcaoAtual?.nome}" salva.`);
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="EPIs e CAs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Matriz EPI x Função</h2>
        <p className="mt-1 text-sm text-epi-muted">
          Crie as funções e defina quais EPIs cada uma recebe, em que quantidade. A matriz é sugerida automaticamente na
          Nova entrega e na Entrega em lote.
        </p>
      </div>

      {!podeEditar && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Você pode consultar a matriz. Para alterar, seu perfil precisa da permissão &quot;EPIs, CAs e matriz&quot;.
        </p>
      )}
      {erro && <p className="mb-4 max-w-[1060px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}
      {aviso && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>
      )}

      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        {/* ----- Escolher / criar função ----- */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-[13px] font-medium text-epi-ink">
              Função
              <select
                value={funcaoId}
                onChange={(event) => {
                  if (alterado && !window.confirm("A matriz tem alterações não salvas. Trocar de função mesmo assim?")) return;
                  limparMensagens();
                  setFuncaoId(event.target.value);
                }}
                className={`mt-2 ${CAMPO}`}
              >
                {funcoesVisiveis.length === 0 && <option value="">Nenhuma função cadastrada</option>}
                {funcoesVisiveis.map((funcao) => (
                  <option key={funcao.id} value={funcao.id}>
                    {funcao.nome}
                    {funcao.status !== "ativa" ? " (inativa)" : ""}
                    {` — ${usoPorFuncao[funcao.id] ?? 0} funcionário(s)`}
                  </option>
                ))}
              </select>
            </label>
            {quantidadeInativas > 0 && (
              <label className="mt-2 flex items-center gap-2 text-xs text-epi-muted">
                <input
                  type="checkbox"
                  checked={mostrarInativas}
                  onChange={(event) => setMostrarInativas(event.target.checked)}
                  className="h-3.5 w-3.5 accent-epi-brand"
                />
                Mostrar funções inativas ({quantidadeInativas})
              </label>
            )}

            {podeEditar && funcaoAtual && !renomeando && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    limparMensagens();
                    setNomeEditado(funcaoAtual.nome);
                    setRenomeando(true);
                  }}
                  className="font-semibold text-epi-brand"
                >
                  Renomear
                </button>
                <button type="button" onClick={alterarStatusFuncao} className="font-semibold text-epi-ink">
                  {funcaoAtual.status === "ativa" ? "Inativar" : "Reativar"}
                </button>
                {(usoPorFuncao[funcaoId] ?? 0) === 0 && (
                  <button type="button" onClick={excluirFuncao} className="font-semibold text-red-600">
                    Excluir
                  </button>
                )}
              </div>
            )}
            {renomeando && (
              <div className="mt-3 flex gap-2">
                <input type="text" value={nomeEditado} onChange={(event) => setNomeEditado(event.target.value)} className={CAMPO} />
                <button type="button" onClick={renomearFuncao} className="rounded-lg bg-epi-brand px-3 text-sm font-semibold text-white">
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setRenomeando(false)}
                  className="rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {podeEditar && (
            <form onSubmit={criarFuncao}>
              <label className="block text-[13px] font-medium text-epi-ink">
                Nova função
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={novaFuncao}
                    onChange={(event) => setNovaFuncao(event.target.value)}
                    placeholder="Ex.: Servente, Pedreiro, Eletricista"
                    className={CAMPO}
                  />
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-lg border border-epi-brand px-4 text-sm font-semibold text-epi-brand"
                  >
                    + Criar função
                  </button>
                </div>
              </label>
              <p className="mt-1 text-xs text-epi-muted">
                Funções digitadas no cadastro ou na planilha de funcionários também aparecem aqui sozinhas.
              </p>
            </form>
          )}
        </div>

        {/* ----- Matriz da função ----- */}
        {funcaoAtual && (
          <>
            <div className="mt-8 flex items-center justify-between">
              <h3 className="text-base font-semibold text-epi-ink">EPIs de &quot;{funcaoAtual.nome}&quot;</h3>
              {podeEditar && (
                <button
                  type="button"
                  onClick={adicionarItem}
                  disabled={epis.length === 0 || usados.size >= epis.length}
                  className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  + Adicionar EPI
                </button>
              )}
            </div>
            {epis.length === 0 && (
              <p className="mt-2 text-sm text-epi-muted">
                Nenhum EPI cadastrado.{" "}
                <SePuder acao="gerenciar_epis">
                  <Link to="/epis-cas/novo" className="font-semibold text-epi-brand">
                    Cadastre um EPI
                  </Link>
                </SePuder>{" "}
                primeiro.
              </p>
            )}

            <div className="mt-4 overflow-x-auto rounded-lg border border-epi-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="px-4 py-3 font-medium">EPI</th>
                    <th className="px-4 py-3 font-medium">CA</th>
                    <th className="w-28 px-4 py-3 font-medium">Quantidade</th>
                    <th className="w-40 px-4 py-3 font-medium">Obrigatoriedade</th>
                    <th className="w-36 px-4 py-3 font-medium">Troca (meses)</th>
                    {podeEditar && <th className="w-24 px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {carregandoMatriz && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-epi-muted">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!carregandoMatriz && itens.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-epi-muted">
                        Nenhum EPI definido para esta função ainda.
                        {podeEditar && ' Clique em "+ Adicionar EPI".'}
                      </td>
                    </tr>
                  )}
                  {!carregandoMatriz &&
                    itens.map((item, indice) =>
                      podeEditar ? (
                        <tr key={indice} className="border-b border-epi-border last:border-0">
                          <td className="px-4 py-2">
                            <select value={item.epiId} onChange={(event) => alterarItem(indice, "epiId", event.target.value)} className={CAMPO}>
                              <option value="">Escolha o EPI...</option>
                              {epis
                                .filter((epi) => epi.id === item.epiId || !usados.has(epi.id))
                                .map((epi) => (
                                  <option key={epi.id} value={epi.id}>
                                    {epi.nome}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-epi-muted">{episPorId[item.epiId]?.ca ?? "—"}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantidade}
                              onChange={(event) => alterarItem(indice, "quantidade", event.target.value)}
                              className={CAMPO}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={item.obrigatorio ? "sim" : "nao"}
                              onChange={(event) => alterarItem(indice, "obrigatorio", event.target.value === "sim")}
                              className={CAMPO}
                            >
                              <option value="sim">Obrigatório</option>
                              <option value="nao">Recomendado</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.periodicidadeMeses}
                              placeholder="—"
                              onChange={(event) => alterarItem(indice, "periodicidadeMeses", event.target.value)}
                              className={CAMPO}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button type="button" onClick={() => removerItem(indice)} className="text-sm font-semibold text-red-600">
                              Remover
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={indice} className="border-b border-epi-border last:border-0">
                          <td className="px-4 py-3 font-medium text-epi-ink">{episPorId[item.epiId]?.nome ?? "—"}</td>
                          <td className="px-4 py-3 text-epi-muted">{episPorId[item.epiId]?.ca ?? "—"}</td>
                          <td className="px-4 py-3 text-epi-muted">{item.quantidade}</td>
                          <td className="px-4 py-3 text-epi-muted">{item.obrigatorio ? "Obrigatório" : "Recomendado"}</td>
                          <td className="px-4 py-3 text-epi-muted">{textoPeriodicidade(item.periodicidadeMeses)}</td>
                        </tr>
                      )
                    )}
                </tbody>
              </table>
            </div>

            {podeEditar && (
              <div className="mt-6 flex items-center justify-end gap-3">
                {alterado && <span className="text-sm text-epi-muted">Alterações não salvas</span>}
                <button
                  type="button"
                  disabled={!alterado || salvando}
                  onClick={() => setItens(JSON.parse(itensSalvos))}
                  className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink disabled:opacity-50"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={!alterado || salvando}
                  onClick={salvarMatriz}
                  className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar matriz"}
                </button>
              </div>
            )}
          </>
        )}

        <p className="mt-6 rounded-lg bg-[#EBF5F0] px-4 py-3 text-sm text-epi-ink">
          Na <b>Nova entrega</b>, ao escolher o funcionário, os EPIs da função dele já vêm preenchidos com a quantidade da
          matriz. Na <b>Entrega em lote</b>, entram os obrigatórios.
        </p>
      </div>
    </AppShell>
  );
}
