import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import SePuder from "../../components/SePuder.jsx";

// Gerenciar locais de estoque (EPI-326): ver todos os locais, editar,
// inativar e reativar. Local não é apagado (pode ter histórico de
// movimentações, ver correção 10): ele é INATIVADO.
// O banco não deixa inativar local que ainda tem EPI (correção 13).
//
// EPI-327: local INATIVO e SEM ESTOQUE pode ser EXCLUÍDO, desde que nunca
// tenha sido usado (sem entradas, entregas ou transferências). Local com
// histórico o banco não deixa apagar (correção 10): ele fica inativo.

export default function LocaisEstoque() {
  const { pode } = useAuth();
  // EPI-331: quem gerencia depende das caixinhas em Usuários e permissões.
  const podeGerenciar = pode("gerenciar_estoque");

  const [locais, setLocais] = useState([]);
  const [saldoPorLocal, setSaldoPorLocal] = useState({});
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [alterandoId, setAlterandoId] = useState("");
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function carregar() {
    const [{ data: locaisData }, { data: saldoData }] = await Promise.all([
      supabase
        .from("locais_estoque")
        .select("id, nome, codigo, status, permite_transferencia, obras(nome), funcionarios(nome)")
        .order("nome"),
      supabase.from("saldo_estoque").select("local_id, saldo"),
    ]);

    const totais = {};
    for (const linha of saldoData ?? []) {
      totais[linha.local_id] = (totais[linha.local_id] ?? 0) + (linha.saldo ?? 0);
    }
    setLocais(locaisData ?? []);
    setSaldoPorLocal(totais);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const locaisVisiveis = useMemo(
    () => locais.filter((local) => mostrarInativos || local.status === "ativo"),
    [locais, mostrarInativos]
  );
  const quantidadeInativos = locais.filter((local) => local.status !== "ativo").length;

  async function alterarStatus(local, novoStatus) {
    setErro("");
    setAviso("");
    setAlterandoId(local.id);

    const { error } = await supabase.from("locais_estoque").update({ status: novoStatus }).eq("id", local.id);

    setAlterandoId("");
    if (error) {
      // A mensagem do banco já explica o motivo (ex.: ainda tem EPI em estoque).
      setErro(error.message || "Não foi possível alterar o local.");
      return;
    }
    setAviso(novoStatus === "ativo" ? `"${local.nome}" foi reativado.` : `"${local.nome}" foi inativado.`);
    carregar();
  }

  async function excluir(local) {
    setErro("");
    setAviso("");
    setAlterandoId(local.id);

    const { error, count } = await supabase
      .from("locais_estoque")
      .delete({ count: "exact" })
      .eq("id", local.id);

    setAlterandoId("");
    setConfirmandoExclusaoId("");

    if (error) {
      // 23503 = chave estrangeira: o local já foi usado em alguma movimentação.
      setErro(
        error.code === "23503"
          ? `"${local.nome}" já tem histórico (entradas, entregas ou transferências) e não pode ser excluído. Ele continua inativo, guardando o histórico.`
          : error.message || "Não foi possível excluir o local."
      );
      return;
    }
    if (count === 0) {
      setErro("Você não tem permissão para excluir este local.");
      return;
    }
    setAviso(`"${local.nome}" foi excluído.`);
    carregar();
  }

  return (
    <AppShell title="Estoque" subtitle="Locais onde os EPIs ficam guardados." activeSection="Estoque">
      <div className="mb-6 flex max-w-[1060px] items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Locais de estoque</h2>
          <p className="mt-1 text-sm text-epi-muted">
            Almoxarifados, containers e depósitos. Local inativo não aparece para entrega, entrada nem transferência.
          </p>
        </div>
        {podeGerenciar && (
          <Link
            to="/estoque/locais/novo"
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Novo local
          </Link>
        )}
      </div>

      {erro && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
      )}
      {aviso && (
        <p className="mb-4 max-w-[1060px] rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>
      )}

      {quantidadeInativos > 0 && (
        <label className="mb-4 flex max-w-[1060px] items-center gap-2 text-sm text-epi-ink">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(event) => setMostrarInativos(event.target.checked)}
          />
          Mostrar inativos ({quantidadeInativos})
        </label>
      )}

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-epi-border text-xs uppercase text-epi-muted">
            <tr>
              <th className="px-4 py-3">Local</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Obra</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">EPIs em estoque</th>
              <th className="px-4 py-3">Situação</th>
              {podeGerenciar && <th className="px-4 py-3 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && locaisVisiveis.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Nenhum local cadastrado.
                </td>
              </tr>
            )}
            {!carregando &&
              locaisVisiveis.map((local) => {
                const total = saldoPorLocal[local.id] ?? 0;
                const ativo = local.status === "ativo";
                return (
                  <tr key={local.id} className="border-b border-epi-border last:border-0">
                    <td className="px-4 py-3 font-medium text-epi-ink">{local.nome}</td>
                    <td className="px-4 py-3 text-epi-muted">{local.codigo || "—"}</td>
                    <td className="px-4 py-3 text-epi-muted">{local.obras?.nome ?? "Central"}</td>
                    <td className="px-4 py-3 text-epi-muted">{local.funcionarios?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-epi-muted">{total}</td>
                    <td className={`px-4 py-3 font-medium ${ativo ? "text-green-700" : "text-epi-muted"}`}>
                      {ativo ? "Ativo" : "Inativo"}
                    </td>
                    {podeGerenciar && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          to={`/estoque/locais/${local.id}/editar`}
                          className="mr-4 font-semibold text-epi-brand"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={alterandoId === local.id || (ativo && total > 0)}
                          title={ativo && total > 0 ? "Transfira o saldo para outro local antes de inativar." : ""}
                          onClick={() => alterarStatus(local, ativo ? "inativo" : "ativo")}
                          className="font-semibold text-epi-ink disabled:cursor-not-allowed disabled:text-epi-muted"
                        >
                          {ativo ? "Inativar" : "Reativar"}
                        </button>
                        {!ativo && total === 0 && confirmandoExclusaoId !== local.id && (
                          <button
                            type="button"
                            disabled={alterandoId === local.id}
                            onClick={() => setConfirmandoExclusaoId(local.id)}
                            className="ml-4 font-semibold text-red-600 disabled:text-epi-muted"
                          >
                            Excluir
                          </button>
                        )}
                        {confirmandoExclusaoId === local.id && (
                          <span className="ml-4 text-sm">
                            <span className="text-epi-ink">Excluir de vez?</span>{" "}
                            <button
                              type="button"
                              disabled={alterandoId === local.id}
                              onClick={() => excluir(local)}
                              className="font-semibold text-red-600"
                            >
                              Sim
                            </button>{" "}
                            <button
                              type="button"
                              onClick={() => setConfirmandoExclusaoId("")}
                              className="font-semibold text-epi-ink"
                            >
                              Não
                            </button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-[1060px] text-xs text-epi-muted">
        Só é possível excluir local <b>inativo</b>, <b>sem estoque</b> e que <b>nunca foi usado</b> (local cadastrado
        por engano). Local com histórico fica inativo. Para inativar um local que ainda tem EPIs, use{" "}
        <SePuder acao="gerenciar_estoque">
          <Link to="/estoque/transferencia" className="font-semibold text-epi-brand">
            Transferir
          </Link>
        </SePuder>{" "}
        e leve o saldo para outro local.
      </p>

      <p className="mt-6 text-sm">
        <Link to="/estoque" className="font-semibold text-epi-brand">
          ← Voltar para o estoque
        </Link>
      </p>
    </AppShell>
  );
}
