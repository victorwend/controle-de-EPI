import { useState } from "react";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCOES_MATRIZ, MATRIZ_POR_FUNCAO } from "../../data/episConfig.js";

export default function MatrizEpiFuncao() {
  const [funcao, setFuncao] = useState(FUNCOES_MATRIZ[0]);
  const itens = MATRIZ_POR_FUNCAO[funcao] ?? [];

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="EPIs e CAs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Matriz EPI x Função</h2>
        <p className="mt-1 text-sm text-epi-muted">Defina os EPIs obrigatórios e recomendados para cada função.</p>
      </div>

      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-1 gap-4">
            <label className="block flex-1 text-[13px] font-medium text-epi-ink">
              Função
              <select
                value={funcao}
                onChange={(event) => setFuncao(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                {FUNCOES_MATRIZ.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1 text-[13px] font-medium text-epi-ink">
              Regra
              <select
                defaultValue="Padrão corporativo"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option>Padrão corporativo</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="h-11 rounded-lg bg-epi-brand px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            + Adicionar EPI
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-epi-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
                <th className="px-4 py-3 font-medium">EPI</th>
                <th className="px-4 py-3 font-medium">CA</th>
                <th className="px-4 py-3 font-medium">Obrigatoriedade</th>
                <th className="px-4 py-3 font-medium">Periodicidade</th>
                <th className="px-4 py-3 font-medium">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.epi} className="border-b border-epi-border last:border-0">
                  <td className="px-4 py-3 font-medium text-epi-ink">{item.epi}</td>
                  <td className="px-4 py-3 text-epi-muted">{item.ca}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-md border px-2 py-1 text-xs font-medium ${
                        item.obrigatoriedade === "Obrigatório"
                          ? "border-epi-brand bg-[#EBF5F0] text-epi-brand"
                          : "border-epi-border text-epi-muted"
                      }`}
                    >
                      {item.obrigatoriedade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-epi-muted">{item.periodicidade}</td>
                  <td className="px-4 py-3 text-epi-muted">{item.quantidade}</td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-epi-muted">
                    Nenhuma matriz definida para esta função ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 rounded-lg bg-[#EBF5F0] px-4 py-3 text-sm text-epi-ink">
          A matriz poderá sugerir automaticamente os EPIs durante uma nova entrega.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Salvar matriz
          </button>
        </div>
      </div>
    </AppShell>
  );
}
