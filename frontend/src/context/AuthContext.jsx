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
      // "*" (todas as colunas do PRÓPRIO usuário) em vez de uma lista fixa:
      // se o código chegar antes da correção SQL que cria uma coluna nova
      // (ex.: trocar_senha, correção 22), a consulta não quebra e o menu
      // não some. A coluna que ainda não existe só vem vazia.
      .select("*")
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

  // EPI-335: recarrega o usuário (ex.: depois de trocar a senha temporária).
  const recarregarUsuario = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await carregarPerfil(data.session);
  }, [carregarPerfil]);

  return (
    <AuthContext.Provider value={{ session, usuario, temObra, loading, refreshTemObra, pode, recarregarUsuario }}>
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
