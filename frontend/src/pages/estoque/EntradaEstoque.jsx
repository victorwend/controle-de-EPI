import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { EPIS } from "../../data/episConfig.js";
import { LOCAIS_ESTOQUE, SALDO_POR_EPI } from "../../data/estoqueConfig.js";

export default function EntradaEstoque() {
  const navigate = useNavigate();
  const [epi, setEpi] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [local, setLocal] = useState("");
  const [documento, setDocumento] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [responsavel, setResponsavel] = useState("Victor Wender");
  const [observacao, setObservacao] = useState("");

  const saldoAtual = epi ? SALDO_POR_EPI[epi]?.saldo ?? 0 : null;
  const quantidadeNumero = Number(quantidade) || 0;
  const novoSaldo = saldoAtual !== null ? saldoAtual + quantidadeNumero : null;

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: persistir no backend quando a Sprint 7 definir a API de movimentações de estoque.
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
                value={local}
                onChange={(event) => setLocal(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  Selecione o local
                </option>
                {LOCAIS_ESTOQUE.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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

            <label className="block text-[13px] font-medium text-epi-ink">
              Data de entrada
              <input
                type="date"
                value={dataEntrada}
                onChange={(event) => setDataEntrada(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Responsável
              <input
                type="text"
                value={responsavel}
                onChange={(event) => setResponsavel(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
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

          <div className="mt-8 flex items-center justify-end border-t border-epi-border pt-6">
            <button
              type="submit"
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Registrar entrada
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Após registrar</h3>
          {saldoAtual === null ? (
            <p className="mt-3 text-sm text-epi-muted">Selecione um EPI para ver o impacto no saldo.</p>
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
