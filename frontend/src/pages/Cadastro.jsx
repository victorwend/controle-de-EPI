import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const PLANOS = [
  {
    id: "starter",
    nome: "Starter",
    descricao: "Uma obra, equipe pequena e o essencial de estoque e entregas.",
  },
  {
    id: "profissional",
    nome: "Profissional",
    descricao: "Múltiplas obras, transferências entre elas e relatórios completos.",
  },
  {
    id: "empresarial",
    nome: "Empresarial",
    descricao: "Uso ilimitado, auditoria avançada e suporte prioritário.",
  },
];

function apenasDigitos(valor) {
  return valor.replace(/\D/g, "");
}

export default function Cadastro() {
  const navigate = useNavigate();

  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [plano, setPlano] = useState(PLANOS[0].id);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  function validar() {
    if (!razaoSocial.trim() || !nomeResponsavel.trim() || !email.trim()) {
      return "Preencha todos os campos obrigatórios.";
    }
    if (apenasDigitos(cnpj).length !== 14) {
      return "Informe um CNPJ válido (14 dígitos).";
    }
    if (senha.length < 6) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (senha !== confirmarSenha) {
      return "As senhas não coincidem.";
    }
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const mensagemValidacao = validar();
    if (mensagemValidacao) {
      setErro(mensagemValidacao);
      return;
    }

    setErro("");
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    });

    if (signUpError) {
      setLoading(false);
      setErro(signUpError.message || "Não foi possível criar a conta.");
      return;
    }

    if (!signUpData.session) {
      setLoading(false);
      setErro(
        "Conta criada, mas a confirmação de e-mail está ativada no projeto Supabase — desative em Authentication > Providers para o cadastro concluir sem esperar o e-mail nesta fase de desenvolvimento."
      );
      return;
    }

    const { error: rpcError } = await supabase.rpc("criar_empresa_com_administrador", {
      p_razao_social: razaoSocial.trim(),
      p_cnpj: apenasDigitos(cnpj),
      p_nome_responsavel: nomeResponsavel.trim(),
      p_plano: plano,
    });

    setLoading(false);

    if (rpcError) {
      setErro(rpcError.message || "Não foi possível registrar a empresa.");
      return;
    }

    await supabase.auth.signOut();
    navigate("/", { state: { cadastroSucesso: true } });
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
            Cadastre sua empresa
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-epi-mist">
            Crie a conta administradora da sua empresa e comece a controlar
            entregas, estoque e certificados de EPI.
          </p>
        </div>

        <div className="max-w-[360px] rounded-2xl bg-epi-brand px-4 py-4 text-center text-[13px] font-semibold">
          Segurança • Rastreabilidade • Conformidade
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[640px] rounded-[20px] border border-epi-border bg-white p-8 md:p-12">
          <h2 className="text-[30px] font-semibold leading-none text-epi-ink">
            Criar conta da empresa
          </h2>
          <p className="mt-2 text-[15px] text-epi-muted">
            Quem preencher este formulário vira o Administrador da empresa.
          </p>

          <form className="mt-8" onSubmit={handleSubmit}>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-epi-muted">
              Dados da empresa
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-[13px] font-semibold text-epi-ink">
                Razão social
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={(event) => setRazaoSocial(event.target.value)}
                  placeholder="Nome da sua empresa"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>

              <label className="block text-[13px] font-semibold text-epi-ink">
                CNPJ
                <input
                  type="text"
                  value={cnpj}
                  onChange={(event) => setCnpj(event.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>
            </div>

            <p className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-epi-muted">
              Dados do administrador
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block text-[13px] font-semibold text-epi-ink">
                Nome completo
                <input
                  type="text"
                  value={nomeResponsavel}
                  onChange={(event) => setNomeResponsavel(event.target.value)}
                  placeholder="Seu nome"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>

              <label className="block text-[13px] font-semibold text-epi-ink">
                E-mail
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@empresa.com.br"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>

              <label className="block text-[13px] font-semibold text-epi-ink">
                Senha
                <input
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>

              <label className="block text-[13px] font-semibold text-epi-ink">
                Confirmar senha
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  placeholder="Repita a senha"
                  className="mt-2 h-[52px] w-full rounded-[10px] border border-epi-border px-4 text-sm font-normal text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
                />
              </label>
            </div>

            <p className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-epi-muted">
              Plano
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {PLANOS.map((opcao) => (
                <label
                  key={opcao.id}
                  className={`block cursor-pointer rounded-[10px] border p-4 text-left transition ${
                    plano === opcao.id
                      ? "border-epi-brand ring-2 ring-epi-brand"
                      : "border-epi-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="plano"
                    value={opcao.id}
                    checked={plano === opcao.id}
                    onChange={() => setPlano(opcao.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-epi-ink">
                    {opcao.nome}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-epi-muted">
                    {opcao.descricao}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-epi-muted">
              Sem cobrança nesta fase de desenvolvimento — só a escolha fica
              registrada para quando o checkout existir.
            </p>

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
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] leading-relaxed text-epi-muted">
            Já tem uma conta?{" "}
            <Link to="/" className="font-semibold text-epi-brand">
              Entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
