import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext.jsx";

// Destino do link de convite/recuperação enviado por e-mail. O cliente
// Supabase já detecta o token na URL e cria a sessão sozinho (detectSessionInUrl,
// padrão) — aqui só falta a pessoa escolher a senha definitiva.
export default function DefinirSenha() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setErro("");
    setEnviando(true);

    const { error } = await supabase.auth.updateUser({ password: senha });

    setEnviando(false);

    if (error) {
      setErro(error.message || "Não foi possível definir a senha.");
      return;
    }

    navigate("/visao-geral");
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-epi-paper p-6">
      <div className="mb-8 text-center">
        <p className="text-[22px] font-semibold leading-none text-epi-ink">PAVIDEZ</p>
        <p className="mt-1 text-[11px] font-semibold tracking-wide text-epi-muted">CONTROLE DE EPI</p>
      </div>

      <div className="w-full max-w-[440px] rounded-[20px] border border-epi-border bg-white p-8">
        <h2 className="text-[26px] font-semibold leading-tight text-epi-ink">Defina sua senha</h2>
        <p className="mt-2 text-[15px] text-epi-muted">Este é o último passo para acessar o sistema.</p>

        {loading ? (
          <p className="mt-6 text-sm text-epi-muted">Carregando...</p>
        ) : !session ? (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Link inválido ou expirado. Peça um novo convite ao administrador da sua empresa.
          </p>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit}>
            <label className="block text-[13px] font-semibold text-epi-ink">
              Senha
              <input
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="mt-4 block text-[13px] font-semibold text-epi-ink">
              Confirmar senha
              <input
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(event) => setConfirmarSenha(event.target.value)}
                placeholder="Repita a senha"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            {erro && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-6 h-[48px] w-full rounded-[10px] bg-epi-brand text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {enviando ? "Salvando..." : "Salvar e entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
