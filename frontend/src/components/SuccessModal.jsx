// Componente genérico para os estados de sucesso do módulo 11 — Estados
// (11.03 a 11.07 no Figma são o mesmo cartão: ícone de check, título, descrição
// e um botão "Fechar"). Ver docs/05-arquitetura/plano-de-producao-telas.md,
// risco 1: usado aqui em vez de duplicar 05.04 — Transferência concluída.
export default function SuccessModal({ title, description, onClose, closeLabel = "Fechar" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-epi-border bg-white px-7 py-7 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF5F0] text-epi-brand">
          ✓
        </div>
        <h3 className="mt-3 text-lg font-semibold text-epi-ink">{title}</h3>
        <p className="mt-2 text-sm text-epi-muted">{description}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 rounded-lg bg-epi-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
