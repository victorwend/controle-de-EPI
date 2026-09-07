import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import SuccessModal from "../../components/SuccessModal.jsx";
import { EPIS } from "../../data/episConfig.js";
import { LOCAIS_ESTOQUE, SALDO_POR_LOCAL } from "../../data/estoqueConfig.js";

export default function TransferenciaEstoque() {
  const navigate = useNavigate();
  const [epi, setEpi] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [responsavelSaida, setResponsavelSaida] = useState("Victor Wender");
  const [responsavelRecebimento, setResponsavelRecebimento] = useState("");
  const [dataTransferencia, setDataTransferencia] = useState("");
  const [documento, setDocumento] = useState("");
  const [concluida, setConcluida] = useState(false);

  const quantidadeNumero = Number(quantidade) || 0;
  const saldoOrigem = epi && origem ? SALDO_POR_LOCAL[epi]?.[origem] ?? 0 : null;
  const saldoDestino = epi && destino ? SALDO_POR_LOCAL[epi]?.[destino] ?? 0 : null;
  const saldoOrigemApos = saldoOrigem !== null ? saldoOrigem - quantidadeNumero : null;
  const saldoDestinoApos = saldoDestino !== null ? saldoDestino + quantidadeNumero : null;

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: persistir no backend quando a Sprint 7 definir a API de movimentações de estoque.
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
              value={epi}
              onChange={(event) => setEpi(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione o EPI
              </option>
              {EPIS.map((item) => (
                <option key={item.ca} value={item.nome}>
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
              value={origem}
              onChange={(event) => setOrigem(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione a origem
              </option>
              {LOCAIS_ESTOQUE.map((item) => (
                <option key={item} value={item} disabled={item === destino}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Destino
            <select
              required
              value={destino}
              onChange={(event) => setDestino(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione o destino
              </option>
              {LOCAIS_ESTOQUE.map((item) => (
                <option key={item} value={item} disabled={item === origem}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Responsável pela saída
            <input
              type="text"
              value={responsavelSaida}
              onChange={(event) => setResponsavelSaida(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Responsável pelo recebimento
            <select
              value={responsavelRecebimento}
              onChange={(event) => setResponsavelRecebimento(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="" disabled>
                Selecione o responsável
              </option>
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Data da transferência
            <input
              type="date"
              value={dataTransferencia}
              onChange={(event) => setDataTransferencia(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
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
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Confirmar transferência
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
