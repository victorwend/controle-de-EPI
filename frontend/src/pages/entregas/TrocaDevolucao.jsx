import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import SuccessModal from "../../components/SuccessModal.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { POSSE_POR_FUNCIONARIO } from "../../data/entregasConfig.js";

// Tela 03.08 — Entregas — Troca e devolução. O Figma não desenha um seletor de
// funcionário nesta tela (o campo "Funcionário selecionado" aparece com texto
// fixo "Colaborador ativo • Obra vinculada") — provavelmente porque no
// protótipo real ela é aberta a partir da ficha do funcionário (04.03, ainda
// não construída, ver Sprint 5). Como aqui ela só é alcançável pelo botão
// "Troca / devolução" da lista geral (03.01), sem contexto de funcionário,
// adicionamos um passo de busca antes — mesma mecânica de busca do wizard de
// Nova entrega (03.02) — para a tela ter um funcionário real antes de mostrar
// os EPIs em posse dele.
export default function TrocaDevolucao() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [funcionario, setFuncionario] = useState(null);

  const [selecionados, setSelecionados] = useState({});
  const [acoes, setAcoes] = useState({});
  const [destinos, setDestinos] = useState({});
  const [motivo, setMotivo] = useState("");
  const [concluida, setConcluida] = useState(false);

  const resultadosFuncionario = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return FUNCIONARIOS.filter((f) => f.nome.toLowerCase().includes(termo) || f.matricula.includes(termo));
  }, [busca]);

  const posse = funcionario ? POSSE_POR_FUNCIONARIO[funcionario.matricula] ?? [] : [];
  const itensSelecionados = posse.filter((item) => selecionados[item.ca]);

  function selecionarFuncionario(f) {
    setFuncionario(f);
    setBusca(`${f.nome} • Matrícula ${f.matricula}`);
    setSelecionados({});
    setAcoes({});
    setDestinos({});
  }

  function alternarItem(ca) {
    setSelecionados((atual) => ({ ...atual, [ca]: !atual[ca] }));
    setAcoes((atual) => ({ ...atual, [ca]: atual[ca] ?? "Trocar" }));
    setDestinos((atual) => ({ ...atual, [ca]: atual[ca] ?? "Estoque" }));
  }

  function confirmarMovimentacao(event) {
    event.preventDefault();
    setConcluida(true);
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
                {funcionario.nome} • {funcionario.obra}
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
              Nenhum EPI em posse registrado para este funcionário neste mock.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-epi-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 font-medium">EPI</th>
                    <th className="px-4 py-3 font-medium">CA</th>
                    <th className="px-4 py-3 font-medium">Ação</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {posse.map((item) => (
                    <tr key={item.ca} className="border-b border-epi-border last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selecionados[item.ca])}
                          onChange={() => alternarItem(item.ca)}
                          className="h-4 w-4 accent-epi-brand"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-epi-ink">{item.epi}</td>
                      <td className="px-4 py-3 text-epi-muted">CA {item.ca}</td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!selecionados[item.ca]}
                          value={acoes[item.ca] ?? "Trocar"}
                          onChange={(event) => setAcoes((atual) => ({ ...atual, [item.ca]: event.target.value }))}
                          className="h-9 rounded-lg border border-epi-border px-2 text-sm text-epi-ink disabled:opacity-40"
                        >
                          <option value="Trocar">Trocar</option>
                          <option value="Devolver">Devolver</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!selecionados[item.ca]}
                          value={destinos[item.ca] ?? "Estoque"}
                          onChange={(event) => setDestinos((atual) => ({ ...atual, [item.ca]: event.target.value }))}
                          className="h-9 rounded-lg border border-epi-border px-2 text-sm text-epi-ink disabled:opacity-40"
                        >
                          <option value="Estoque">Estoque</option>
                          <option value="Descarte">Descarte</option>
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
                <li key={item.ca}>
                  {acoes[item.ca] === "Trocar"
                    ? `${item.epi}: devolvido → ${destinos[item.ca]}, nova unidade entregue`
                    : `${item.epi}: devolvido → ${destinos[item.ca]}`}
                </li>
              ))}
            </ul>
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
              disabled={itensSelecionados.length === 0}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Confirmar movimentação
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
