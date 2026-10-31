import { Link } from "react-router-dom";

// Caixa "De qual estoque?" usada nas telas de entrega e troca/devolução (EPI-325).
export default function SeletorLocalEstoque({ locais, value, onChange, rotulo, disabled = false, carregandoSaldo = false }) {
  return (
    <div className="mb-6 flex max-w-[1060px] flex-wrap items-end gap-3 rounded-xl border border-epi-border bg-white p-4">
      <label className="block min-w-[260px] flex-1 text-[13px] font-medium text-epi-ink">
        {rotulo}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand disabled:bg-epi-paper"
        >
          {locais.map((local) => (
            <option key={local.id} value={local.id}>
              {local.nome}
            </option>
          ))}
        </select>
      </label>
      <p className="pb-3 text-xs text-epi-muted">
        {carregandoSaldo ? "Atualizando saldos..." : "Os saldos mostrados são deste local."}{" "}
        <Link to="/estoque/locais" className="font-semibold text-epi-brand">
          Gerenciar locais
        </Link>
      </p>
    </div>
  );
}
