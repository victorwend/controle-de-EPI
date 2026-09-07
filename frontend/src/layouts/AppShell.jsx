import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Visão geral", to: "/visao-geral" },
  { label: "Entregas de EPI", to: "/entregas" },
  { label: "Funcionários", to: "/funcionarios" },
  { label: "Estoque", to: "/estoque" },
  { label: "EPIs e CAs", to: "/epis-cas" },
  { label: "Obras", to: "/obras" },
  { label: "Cadastros", to: "/cadastros/setor" },
  { label: "Relatórios", to: "/relatorios" },
  { label: "Configurações", to: "/configuracoes" },
];

export default function AppShell({ title, subtitle, activeSection, children }) {
  return (
    <div className="flex min-h-screen w-full bg-epi-paper">
      <aside className="flex w-[248px] shrink-0 flex-col bg-epi-shell px-6 py-8 text-white">
        <div className="px-2">
          <p className="text-[22px] font-semibold leading-none">PAVIDEZ</p>
          <p className="mt-1 text-[11px] font-semibold tracking-wide text-epi-tint">
            CONTROLE DE EPI
          </p>
        </div>

        <nav className="mt-10 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.label;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  isActive
                    ? "bg-epi-shellActive font-semibold text-white"
                    : "text-epi-mist hover:bg-white/5"
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-epi-border bg-white px-10 py-6">
          <div>
            <h1 className="text-xl font-semibold text-epi-ink">{title}</h1>
            <p className="mt-1 text-sm text-epi-muted">{subtitle}</p>
          </div>
          <p className="text-sm text-epi-muted">Victor • Administrador</p>
        </header>

        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
