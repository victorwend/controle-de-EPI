import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";

const PONTOS_PARA_VALIDAR = [
  "CA é obrigatório?",
  "O sistema deve consultar validade?",
  "Existe tamanho/numeração?",
  "Há EPI por função?",
  "Troca por prazo ou desgaste?",
  "Precisa anexar certificado?",
];

export default function NovoEpi() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ca, setCa] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [validadeCA, setValidadeCA] = useState("");
  const [periodicidade, setPeriodicidade] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [descricao, setDescricao] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    // TODO: persistir no backend quando a Sprint 6 definir a API de EPIs e CAs.
    navigate("/epis-cas");
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="EPIs e CAs">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Novo EPI</h2>
        <p className="mt-1 text-sm text-epi-muted">Cadastre o equipamento, certificado de aprovação e regras de controle.</p>
      </div>

      <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-epi-border bg-white p-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              Nome do EPI *
              <input
                type="text"
                required
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Capacete de segurança classe B"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Categoria *
              <select
                required
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  Selecione a categoria
                </option>
              </select>
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              CA *
              <input
                type="text"
                required
                value={ca}
                onChange={(event) => setCa(event.target.value)}
                placeholder="12345"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Fabricante
              <input
                type="text"
                value={fabricante}
                onChange={(event) => setFabricante(event.target.value)}
                placeholder="MSA"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Validade do CA *
              <input
                type="date"
                required
                value={validadeCA}
                onChange={(event) => setValidadeCA(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Periodicidade de troca
              <input
                type="text"
                value={periodicidade}
                onChange={(event) => setPeriodicidade(event.target.value)}
                placeholder="12 meses"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Estoque mínimo
              <input
                type="number"
                min="0"
                value={estoqueMinimo}
                onChange={(event) => setEstoqueMinimo(event.target.value)}
                placeholder="30"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              Descrição / observação de uso
              <textarea
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
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
              Salvar EPI
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Pontos para validar</h3>
          <ul className="mt-3 space-y-2 text-sm text-epi-muted">
            {PONTOS_PARA_VALIDAR.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
