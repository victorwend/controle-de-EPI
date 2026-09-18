import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cadastroSucesso = Boolean(location.state?.cadastroSucesso);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    navigate("/visao-geral");
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-epi-paper md:flex-row">
      <aside className="flex w-full shrink-0 flex-col justify-between bg-epi-panel px-10 py-12 text-white md:w-[520px] md:px-16 md:py-16">
        <div>
          <p className="text-[28px] font-semibold leading-none">PAVIDEZ</p>
          <p className="mt-2 text-sm font-semibold tracking-wide text-epi-tint">
            CONTROLE DE EPI
          </p>
        </div>

        <div className="max-w-[390px] py-16">
          <h1 className="text-[38px] font-semibold leading-tight">
            Gestão de Equipamentos de Proteção Individual
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-epi-mist">
            Controle entregas, estoque, certificados de aprovação e histórico
            dos colaboradores em um único sistema.
          </p>
        </div>

        <div className="max-w-[360px] rounded-2xl bg-epi-brand px-4 py-4 text-center text-[13px] font-semibold">
          Segurança • Rastreabilidade • Conformidade
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[520px] rounded-[20px] border border-epi-border bg-white p-8 md:p-12">
          <h2 className="text-[30px] font-semibold leading-none text-epi-ink">
            Acessar sistema
          </h2>
          <p className="mt-2 text-[15px] text-epi-muted">
            Entre com suas credenciais para continuar.
          </p>

          {cadastroSucesso && (
            <p className="mt-6 rounded-[10px] bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              Conta criada com sucesso! Faça login para continuar.
            </p>
          )}

          <form className="mt-8" onSubmit={handleSubmit}>
            <label className="block text-[13px] font-semibold text-epi-ink">
              E-mail
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Digite seu e-mail"
                className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="mt-6 block text-[13px] font-semibold text-epi-ink">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <button
              type="button"
              className="mt-3 block w-full text-right text-[13px] font-semibold text-epi-brand"
            >
              Esqueci minha senha
            </button>

            {erro && (
              <p className="mt-6 rounded-[10px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-8 h-[54px] w-full rounded-[10px] bg-epi-brand text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] leading-relaxed text-epi-muted">
            Ainda não tem uma empresa cadastrada?{" "}
            <Link to="/cadastro" className="font-semibold text-epi-brand">
              Criar conta
            </Link>
            <br />
            Em caso de dificuldade, contate o administrador da sua empresa.
          </p>
        </div>
      </main>
    </div>
  );
}
