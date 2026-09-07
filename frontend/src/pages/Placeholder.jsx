import { useLocation } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";

const SECTION_BY_PATH = {
  "/visao-geral": "Visão geral",
  "/entregas": "Entregas de EPI",
  "/funcionarios": "Funcionários",
  "/estoque": "Estoque",
  "/epis-cas": "EPIs e CAs",
  "/obras": "Obras",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const section = SECTION_BY_PATH[pathname] ?? "Sistema";

  return (
    <AppShell title={section} subtitle="Esta tela ainda não foi construída." activeSection={section}>
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10 text-sm text-epi-muted">
        {section} entra em uma sprint futura — ver `docs/05-arquitetura/plano-de-producao-telas.md`.
      </div>
    </AppShell>
  );
}
