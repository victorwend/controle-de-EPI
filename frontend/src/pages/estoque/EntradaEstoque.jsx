import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function EntradaEstoque() {
  const navigate = useNavigate();
  const [epis, setEpis] = useState([]);
  const [locais, setLocais] = useState([]);
  const [epiId, setEpiId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [localId, setLocalId] = useState("");
  const [documento, setDocumento] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saldoAtual, setSaldoAtual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from("epis").select("id, nome").order("nome"),
      supabase.from("locais_estoque").select("id, nome").eq("status", "ativo").order("nome"),
    ]).then(([{ data: episData }, { data: locaisData }]) => {
      if (!ativo) return;
      setEpis(episData ?? []);
      setLocais(locaisData ?? []);
    });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!epiId || !localId) {
      setSaldoAtual(null);
      return;
    }
    let ativo = true;
    supabase
      .from("saldo_estoque")
      .select("saldo")
      .eq("epi_id", epiId)
      .eq("local_id", localId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setSaldoAtual(data?.saldo ?? 0);
      });
    return () => {
      ativo = false;
    };
  }, [epiId, localId]);

  const quantidadeNumero = Number(quantidade) || 0;
  const novoSaldo = saldoAtual !== null ? saldoAtual + quantidadeNumero : null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!epiId || !localId || quantidadeNumero <= 0) {
      setErro("Selecione o EPI, o local e uma quantidade maior que zero.");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.rpc("registrar_entrada_estoque", {
      p_epi_id: epiId,
      p_local_id: localId,
      p_quantidade: quantidadeNumero,
      p_documento: documento.trim() || null,
      p_fornecedor: fornecedor.trim() || null,
      p_observacao: observacao.trim() || null,
    });

    setLoading(false);

    if (error) {
      setErro(error.message || "Não foi possível registrar a entrada.");
      return;
    }

    navigate("/estoque");
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Estoque">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Entrada de estoque</h2>
        <p className="mt-1 text-sm text-epi-muted">Registre recebimentos e ajuste o saldo disponível por local.</p>
      </div>

      <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-epi-border bg-white p-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              EPI *
              <select
                required
                value={epiId}
                onChange={(event) => setEpiId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  Selecione o EPI
                </option>
                {epis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Quantidade *
              <input
                type="number"
                min="1"
                required
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
                placeholder="50"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Local de estoque *
              <select
                required
                value={localId}
                onChange={(event) => setLocalId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  Selecione o local
                </option>
                {locais.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
              {locais.length === 0 && (
                <span className="mt-1 block text-xs text-epi-muted">
                  Nenhum local cadastrado ainda —{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/estoque/locais/novo")}
                    className="font-semibold text-epi-brand"
                  >
                    cadastrar um local
                  </button>
                  .
                </span>
              )}
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Documento / NF
              <input
                type="text"
                value={documento}
                onChange={(event) => setDocumento(event.target.value)}
                placeholder="NF 45872"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Fornecedor
              <input
                type="text"
                value={fornecedor}
                onChange={(event) => setFornecedor(event.target.value)}
                placeholder="Fornecedor Exemplo Ltda."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              Observação
              <textarea
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-epi-border px-3 py-2 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>
          </div>

          {erro && (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
          )}

          <div className="mt-8 flex items-center justify-end border-t border-epi-border pt-6">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Registrando..." : "Registrar entrada"}
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Após registrar</h3>
          {saldoAtual === null ? (
            <p className="mt-3 text-sm text-epi-muted">Selecione o EPI e o local para ver o impacto no saldo.</p>
          ) : (
            <div className="mt-3 space-y-1 text-sm text-epi-ink">
              <p>Saldo atual: {saldoAtual}</p>
              <p>Entrada: +{quantidadeNumero}</p>
              <p className="font-semibold">Novo saldo: {novoSaldo}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-epi-muted">
            Validar se é necessário lote, valor unitário, NF, pedido de compra e transferência entre obras.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
