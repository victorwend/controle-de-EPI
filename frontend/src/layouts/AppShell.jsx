import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext.jsx";
import { abaDaRota, rotuloPerfil } from "../lib/permissoes.js";

const NAV_ITEMS = [
  { label: "Visão geral", to: "/visao-geral" },
  { label: "Entregas de EPI", to: "/entregas" },
  { label: "Funcionários", to: "/funcionarios" },
  { label: "Estoque", to: "/estoque" },
  { label: "EPIs e CAs", to: "/epis-cas" },
  { label: "Obras", to: "/obras" },
  { label: "Cadastros", to: "/cadastros" },
  { label: "Relatórios", to: "/relatorios" },
  // EPI-329: só aparece para o Administrador (ver somenteAdministrador).
  { label: "Usuários e permissões", to: "/usuarios", somenteAdministrador: true },
  // EPI-333: Configurações também é só do Administrador.
  { label: "Configurações", to: "/configuracoes", somenteAdministrador: true },
];

export default function AppShell({ title, subtitle, activeSection, children }) {
  const { usuario, pode } = useAuth();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  // EPI-334: encerra a sessão no Supabase e volta para o login.
  async function sair() {
    setSaindo(true);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }
  const ehAdministrador = usuario?.perfil === "administrador";
  // EPI-333: cada aba só aparece se estiver liberada para o perfil
  // (caixinhas em Usuários e permissões). Visão geral é de todos.
  const itensVisiveis = NAV_ITEMS.filter((item) => {
    if (item.somenteAdministrador) return ehAdministrador;
    const aba = abaDaRota(item.to);
    return !aba || pode(aba);
  });

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
          {itensVisiveis.map((item) => {
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
            {subtitle && <p className="mt-1 text-sm text-epi-muted">{subtitle}</p>}
          </div>
          {usuario && (
            <div className="flex items-center gap-4">
              <p className="text-sm text-epi-muted">
                {usuario.nome_completo} • {rotuloPerfil(usuario.perfil)}
              </p>
              <button
                type="button"
                onClick={sair}
                disabled={saindo}
                className="rounded-lg border border-epi-border px-3 py-1.5 text-sm font-medium text-epi-ink hover:bg-epi-paper disabled:opacity-60"
              >
                {saindo ? "Saindo..." : "Sair"}
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-10">{children}</main>
      </div>
    </div>
  );
}
