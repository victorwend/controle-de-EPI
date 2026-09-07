import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";

export default function FuncionarioEmConstrucao({ title }) {
  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
        <h2 className="text-base font-semibold text-epi-ink">{title}</h2>
        <p className="mt-2">
          Esta tela ainda não foi construída — depende da decisão de arquitetura da biometria (ver{" "}
          <code>docs/05-arquitetura/plano-de-producao-telas.md</code>, risco 3).
        </p>
        <Link to="/funcionarios" className="mt-3 inline-block font-semibold text-epi-brand">
          ← Voltar para Funcionários
        </Link>
      </div>
    </AppShell>
  );
}
