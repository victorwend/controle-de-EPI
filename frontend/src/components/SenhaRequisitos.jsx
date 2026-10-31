import { avaliarSenha } from "../lib/validacoes";

// Lista das regras de senha forte, marcando em verde o que já foi
// cumprido enquanto a pessoa digita (EPI-322).
export default function SenhaRequisitos({ senha }) {
  const regras = avaliarSenha(senha);

  return (
    <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
      {regras.map((regra) => (
        <li
          key={regra.id}
          className={regra.ok ? "font-semibold text-green-700" : "text-epi-muted"}
        >
          <span aria-hidden="true">{regra.ok ? "✓" : "•"}</span> {regra.texto}
          <span className="sr-only">{regra.ok ? " (cumprido)" : " (falta)"}</span>
        </li>
      ))}
    </ul>
  );
}
