import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { podeFazer } from "../lib/permissoes.js";

const AuthContext = createContext(null);

async function contarObras() {
  const { count } = await supabase.from("obras").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null);
  // EPI-331: ações que o perfil do usuário logado pode fazer (caixinhas
  // marcadas pelo Administrador em Usuários e permissões).
  const [minhasAcoes, setMinhasAcoes] = useState([]);
  const [temObra, setTemObra] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(async (sessionAtual) => {
    if (!sessionAtual) {
      setUsuario(null);
      setMinhasAcoes([]);
      setTemObra(false);
      return;
    }

    const { data } = await supabase
      .from("usuarios")
      .select("id, empresa_id, nome_completo, perfil, status")
      .eq("id", sessionAtual.user.id)
      .maybeSingle();

    setUsuario(data ?? null);

    if (data && data.perfil !== "administrador") {
      const { data: linhas } = await supabase.from("permissoes_perfil").select("acao").eq("perfil", data.perfil);
      setMinhasAcoes((linhas ?? []).map((linha) => linha.acao));
    } else {
      setMinhasAcoes([]);
    }
    setTemObra(await contarObras());
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      await carregarPerfil(data.session);
      if (ativo) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, novaSession) => {
      if (!ativo) return;
      setLoading(true);
      setSession(novaSession);
      await carregarPerfil(novaSession);
      if (ativo) setLoading(false);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const refreshTemObra = useCallback(async () => {
    setTemObra(await contarObras());
  }, []);

  // pode("registrar_entregas") -> true/false. Serve só para esconder
  // botões: quem garante a regra é o banco.
  const pode = useCallback((acao) => podeFazer(usuario?.perfil, acao, minhasAcoes), [usuario, minhasAcoes]);

  return (
    <AuthContext.Provider value={{ session, usuario, temObra, loading, refreshTemObra, pode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>.");
  }
  return context;
}
