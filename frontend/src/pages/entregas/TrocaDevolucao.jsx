import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import SuccessModal from "../../components/SuccessModal.jsx";
import { supabase } from "../../lib/supabaseClient";

const LOCAL_PADRAO_NOME = "Almoxarifado Central";

// Tela 03.08 — Entregas — Troca e devolução. O Figma não desenha um seletor de
// funcionário nesta tela — como ela só é alcançável pelo botão "Troca /
// devolução" da lista geral (03.01), sem contexto de funcionário, mantemos o
// passo de busca adicionado nas sessões anteriores.
export default function TrocaDevolucao() {
  const navigate = useNavigate();
  const [localPadrao, setLocalPadrao] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState("");
  const [funcionario, setFuncionario] = useState(null);
  const [posse, setPosse] = useState([]);

  const [selecionados, setSelecionados] = useState({});
  const [acoes, setAcoes] = useState({});
  const [destinos, setDestinos] = useState({});
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluida, setConcluida] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("funcionarios")
        .select("id, matricula, nome, funcao, obras(nome)")
        .eq("status", "ativo")
        .order("nome"),
      supabase.from("locais_estoque").select("id, nome").eq("nome", LOCAL_PADRAO_NOME).limit(1),
    ]).then(([{ data: funcionariosData }, { data: locaisData }]) => {
      if (!ativo) return;
      setFuncionarios(funcionariosData ?? []);
      setLocalPadrao(locaisData?.[0] ?? null);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const resultadosFuncionario = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return funcionarios.filter((f) => f.nome.toLowerCase().includes(termo) || f.matricula.includes(termo));
  }, [busca, funcionarios]);

  const itensSelecionados = posse.filter((item) => selecionados[item.epi_id]);

  async function selecionarFuncionario(f) {
    setFuncionario(f);
    setBusca(`${f.nome} • Matrícula ${f.matricula}`);
    setSelecionados({});
    setAcoes({});
    setDestinos({});

    const { data } = await supabase
      .from("posse_epi_funcionario")
      .select("epi_id, quantidade, epis(nome, ca)")
      .eq("funcionario_id", f.id)
      .gt("quantidade", 0);
    setPosse(data ?? []);
  }

  function alternarItem(epiId) {
    setSelecionados((atual) => ({ ...atual, [epiId]: !atual[epiId] }));
    setAcoes((atual) => ({ ...atual, [epiId]: atual[epiId] ?? "troca" }));
    setDestinos((atual) => ({ ...atual, [epiId]: atual[epiId] ?? "estoque" }));
  }

  async function confirmarMovimentacao(event) {
    event.preventDefault();

    if (!localPadrao) {
      setErro(`Cadastre o local "${LOCAL_PADRAO_NOME}" antes de registrar trocas/devoluções.`);
      return;
    }

    setErro("");
    setEnviando(true);

    const { error } = await supabase.rpc("registrar_troca_devolucao", {
      p_funcionario_id: funcionario.id,
      p_local_id: localPadrao.id,
      p_motivo: motivo.trim() || null,
      p_itens: itensSelecionados.map((item) => ({
        epi_id: item.epi_id,
        quantidade: item.quantidade,
        acao: acoes[item.epi_id] ?? "troca",
        destino: destinos[item.epi_id] ?? "estoque",
      })),
    });

    setEnviando(false);

    if (error) {
      setErro(error.message || "Não foi possível registrar a movimentação.");
      return;
    }

    setConcluida(true);
  }

  if (carregando) {
    return (
      <AppShell title="Troca e devolução de EPI" activeSection="Entregas de EPI">
        <p className="text-sm text-epi-muted">Carregando...</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Troca e devolução de EPI" subtitle="Registre devoluções e trocas mantendo o histórico da movimentação." activeSection="Entregas de EPI">
      {!funcionario && (
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
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
            {resultadosFuncionario.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-lg border border-epi-border">
                {resultadosFuncionario.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => selecionarFuncionario(f)}
                    className="block w-full px-3 py-2 text-left text-sm text-epi-ink hover:bg-epi-paper"
                  >
                    {f.nome} • Matrícula {f.matricula} • {f.obras?.nome ?? "—"}
                  </button>
                ))}
              </div>
            )}
          </label>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/entregas")}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {funcionario && (
        <form onSubmit={confirmarMovimentacao} className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-epi-muted">Funcionário selecionado</p>
              <p className="mt-1 text-base font-semibold text-epi-ink">
                {funcionario.nome} • {funcionario.obras?.nome ?? "—"}
              </p>
            </div>
            <label className="block text-[13px] font-medium text-epi-ink">
              Motivo *
              <input
                type="text"
                required
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ex.: Desgaste natural"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-epi-ink">EPIs em posse do funcionário</h3>

          {posse.length === 0 ? (
            <p className="mt-3 rounded-lg bg-epi-paper px-4 py-3 text-sm text-epi-muted">
              Nenhum EPI em posse registrado para este funcionário.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-epi-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 font-medium">EPI</th>
                    <th className="px-4 py-3 font-medium">CA</th>
                    <th className="px-4 py-3 font-medium">Qtd.</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {posse.map((item) => (
                    <tr key={item.epi_id} className="border-b border-epi-border last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selecionados[item.epi_id])}
                          onChange={() => alternarItem(item.epi_id)}
                          className="h-4 w-4 accent-epi-brand"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-epi-ink">{item.epis?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">CA {item.epis?.ca ?? "—"}</td>
                      <td className="px-4 py-3 text-epi-muted">{item.quantidade}</td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!selecionados[item.epi_id]}
                          value={acoes[item.epi_id] ?? "troca"}
                          onChange={(event) => setAcoes((atual) => ({ ...atual, [item.epi_id]: event.target.value }))}
                          className="h-9 rounded-lg border border-epi-border px-2 text-sm text-epi-ink disabled:opacity-40"
                        >
                          <option value="troca">Trocar</option>
                          <option value="devolucao">Devolver</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!selecionados[item.epi_id]}
                          value={destinos[item.epi_id] ?? "estoque"}
                          onChange={(event) => setDestinos((atual) => ({ ...atual, [item.epi_id]: event.target.value }))}
                          className="h-9 rounded-lg border border-epi-border px-2 text-sm text-epi-ink disabled:opacity-40"
                        >
                          <option value="estoque">Estoque</option>
                          <option value="descarte">Descarte</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-[#EBF5F0] px-4 py-3 text-sm text-epi-brand">
            Resumo: {itensSelecionados.length} {itensSelecionados.length === 1 ? "item selecionado" : "itens selecionados"} para movimentação.
          </div>

          {itensSelecionados.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-epi-muted">
              {itensSelecionados.map((item) => (
                <li key={item.epi_id}>
                  {acoes[item.epi_id] === "troca"
                    ? `${item.epis?.nome}: devolvido → ${destinos[item.epi_id]}, nova unidade entregue`
                    : `${item.epis?.nome}: devolvido → ${destinos[item.epi_id]}`}
                </li>
              ))}
            </ul>
          )}

          {erro && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
            <button
              type="button"
              onClick={() => navigate("/entregas")}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={itensSelecionados.length === 0 || enviando}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {enviando ? "Confirmando..." : "Confirmar movimentação"}
            </button>
          </div>
        </form>
      )}

      {concluida && (
        <SuccessModal
          title="Movimentação registrada"
          description="A devolução ou troca foi registrada com sucesso."
          onClose={() => navigate("/entregas")}
        />
      )}
    </AppShell>
  );
}
