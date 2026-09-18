import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth() {
  const { loading, session, temObra } = useAuth();
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

  if (!temObra && location.pathname !== "/obras/nova") {
    return <Navigate to="/obras/nova" replace />;
  }

  return <Outlet />;
}
