import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient";

export default function RequireAuth() {
  const { loading, session, temObra, usuario } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-epi-paper text-sm text-epi-muted">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // EPI-329 (RN-013): usuário inativo não usa o sistema. O banco já
  // esconde todos os dados dele; aqui a tela só explica o motivo.
  if (usuario?.status === "inativo") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-epi-paper p-6">
        <div className="max-w-md rounded-xl border border-epi-border bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-epi-ink">Acesso inativo</h1>
          <p className="mt-2 text-sm text-epi-muted">
            Seu usuário está inativo. Fale com o administrador da sua empresa para liberar o acesso.
          </p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-6 rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (!temObra && location.pathname !== "/obras/nova") {
    return <Navigate to="/obras/nova" replace />;
  }

  return <Outlet />;
}
