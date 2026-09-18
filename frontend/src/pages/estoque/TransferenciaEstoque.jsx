import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import SuccessModal from "../../components/SuccessModal.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function TransferenciaEstoque() {
  const navigate = useNavigate();
  const [epis, setEpis] = useState([]);
  const [locais, setLocais] = useState([]);
  const [epiId, setEpiId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [documento, setDocumento] = useState("");
  const [saldoOrigem, setSaldoOrigem] = useState(null);
  const [saldoDestino, setSaldoDestino] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [concluida, setConcluida] = useState(false);

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
    if (!epiId || !origemId) {
      setSaldoOrigem(null);
      return;
    }
    let ativo = true;
    supabase
      .from("saldo_estoque")
      .select("saldo")
      .eq("epi_id", epiId)
      .eq("local_id", origemId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setSaldoOrigem(data?.saldo ?? 0);
      });
    return () => {
      ativo = false;
    };
  }, [epiId, origemId]);

  useEffect(() => {
    if (!epiId || !destinoId) {
      setSaldoDestino(null);
      return;
    }
    let ativo = true;
    supabase
      .from("saldo_estoque")
      .select("saldo")
      .eq("epi_id", epiId)
      .eq("local_id", destinoId)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo) setSaldoDestino(data?.saldo ?? 0);
      });
    return () => {
      ativo = false;
    };
  }, [epiId, destinoId]);

  const quantidadeNumero = Number(quantidade) || 0;
  const saldoOrigemApos = saldoOrigem !== null ? saldoOrigem - quantidadeNumero : null;
  const saldoDestinoApos = saldoDestino !== null ? saldoDestino + quantidadeNumero : null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!epiId || !origemId || !destinoId || quantidadeNumero <= 0) {
      setErro("Selecione o EPI, origem, destino e uma quantidade maior que zero.");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.rpc("transferir_estoque", {
      p_epi_id: epiId,
      p_local_origem_id: origemId,
      p_local_destino_id: destinoId,
      p_quantidade: quantidadeNumero,
      p_documento: documento.trim() || null,
    });

    setLoading(false);

    if (error) {
      setErro(error.message || "Não foi possível registrar a transferência.");
      return;
    }

    setConcluida(true);
  }

  return (
    <AppShell title="Transferência de estoque" subtitle="Movimente EPIs entre obras e locais com rastreabilidade." activeSection="Estoque">
      <form onSubmit={handleSubmit} className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        <h2 className="text-lg font-semibold text-epi-ink">Transferir item</h2>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <label className="block text-[13px] font-medium text-epi-ink">
            EPI
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
            Quantidade
            <input
              type="number"
              min="1"
              required
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
              placeholder="20"
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Origem
            <select
              required
              value={origemId}
              onChange={(event) => setOrigemId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione a origem
              </option>
              {locais.map((item) => (
                <option key={item.id} value={item.id} disabled={item.id === destinoId}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Destino
            <select
              required
              value={destinoId}
              onChange={(event) => setDestinoId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione o destino
              </option>
              {locais.map((item) => (
                <option key={item.id} value={item.id} disabled={item.id === origemId}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Documento / referência
            <input
              type="text"
              value={documento}
              onChange={(event) => setDocumento(event.target.value)}
              placeholder="TRF-2026-0018"
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
          </label>
        </div>

        {saldoOrigemApos !== null && saldoDestinoApos !== null && (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Saldo origem após transferência: {saldoOrigemApos} unidades • Saldo destino: {saldoDestinoApos} unidades
          </p>
        )}

        {erro && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
          <button
            type="button"
            onClick={() => navigate("/estoque")}
            className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Confirmando..." : "Confirmar transferência"}
          </button>
        </div>
      </form>

      {concluida && (
        <SuccessModal
          title="Transferência concluída"
          description="A transferência de estoque foi registrada com sucesso."
          onClose={() => navigate("/estoque")}
        />
      )}
    </AppShell>
  );
}
