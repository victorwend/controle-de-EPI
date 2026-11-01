import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { abaDaRota } from "../lib/permissoes.js";

// Trava das abas (EPI-333). Fica em volta das rotas no App.jsx.
// Se o endereço pertence a uma aba que NÃO está liberada para o perfil
// (caixinhas em Usuários e permissões), mostra "sem acesso" em vez da
// tela. somenteAdministrador: rotas que só o Administrador abre.
//
// Isso controla o que APARECE. Quem barra gravações é o banco.
export default function RequireAba({ somenteAdministrador = false }) {
  const { usuario, pode } = useAuth();
  const { pathname } = useLocation();

  const ehAdministrador = usuario?.perfil === "administrador";
  const aba = abaDaRota(pathname);
  const liberado = somenteAdministrador ? ehAdministrador : !aba || pode(aba);

  if (!usuario || liberado) return <Outlet />;

  return (
    <AppShell title="Sem acesso">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
        <h2 className="text-base font-semibold text-epi-ink">Esta aba não está liberada para o seu perfil</h2>
        <p className="mt-2">Se você precisa dela, fale com o administrador da sua empresa.</p>
        <Link to="/visao-geral" className="mt-3 inline-block font-semibold text-epi-brand">
          ← Ir para a Visão geral
        </Link>
      </div>
    </AppShell>
  );
}
