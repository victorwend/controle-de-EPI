import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";
import { PERFIL_PADRAO, PERFIS } from "../../lib/permissoes.js";
import { gerarSenhaTemporaria, senhaForte } from "../../lib/validacoes";
import SenhaRequisitos from "../../components/SenhaRequisitos";

// EPI-329: os perfis vêm de lib/permissoes.js (o Operador saiu). O perfil
// sugerido é o Gestor, que só consulta: quem convida escolhe dar mais.

export default function NovoUsuario() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState(PERFIL_PADRAO);
  const [obras, setObras] = useState([]);
  const [obrasSelecionadas, setObrasSelecionadas] = useState({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  // EPI-335: "convite" (e-mail) ou "senha_temporaria" (admin define a senha).
  const [modo, setModo] = useState("convite");
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaCriada, setSenhaCriada] = useState("");

  useEffect(() => {
    let ativo = true;
    supabase
      .from("obras")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => {
        if (ativo) setObras(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, []);

  function alternarObra(obraId) {
    setObrasSelecionadas((atual) => ({ ...atual, [obraId]: !atual[obraId] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!nome.trim() || !email.trim()) {
      setErro("Preencha nome e e-mail.");
      return;
    }

    if (modo === "senha_temporaria" && !senhaForte(senhaTemporaria)) {
      setErro("A senha temporária não atende a todos os requisitos listados abaixo do campo.");
      return;
    }

    setErro("");
    setSucesso("");
    setSenhaCriada("");
    setLoading(true);

    const obraIds = Object.keys(obrasSelecionadas).filter((id) => obrasSelecionadas[id]);

    const { data, error } = await supabase.functions.invoke("convidar-usuario", {
      body: {
        nome: nome.trim(),
        email: email.trim(),
        perfil,
        obraIds,
        redirectTo: `${window.location.origin}/definir-senha`,
        modo,
        senhaTemporaria: modo === "senha_temporaria" ? senhaTemporaria : undefined,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      setErro(data?.error || error?.message || "Não foi possível enviar o convite.");
      return;
    }

    if (modo === "senha_temporaria") {
      setSenhaCriada(senhaTemporaria);
      setSucesso(
        data?.emailEnviado
          ? "Usuário criado com a senha temporária abaixo. Também enviamos um e-mail para a pessoa criar a própria senha. No primeiro acesso, ela será obrigada a trocar a senha."
          : "Usuário criado com a senha temporária abaixo. O e-mail de aviso não pôde ser enviado agora (limite de e-mails do provedor), mas a pessoa já pode entrar e será obrigada a trocar a senha no primeiro acesso."
      );
    } else {
      setSucesso("Convite enviado! A pessoa vai receber um e-mail para definir a senha.");
    }
    setSenhaTemporaria("");
    setNome("");
    setEmail("");
    setPerfil(PERFIL_PADRAO);
    setObrasSelecionadas({});
  }

  if (usuario && usuario.perfil !== "administrador") {
    return (
      <AppShell title="Cadastro de usuário" activeSection="Usuários e permissões">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          Só o Administrador da empresa pode convidar novos usuários.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Cadastro de usuário" subtitle="Controle quem pode acessar o sistema e suas permissões." activeSection="Usuários e permissões">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        <h2 className="text-lg font-semibold text-epi-ink">Cadastro de usuário</h2>
        <p className="mt-1 text-sm text-epi-muted">
          A pessoa recebe um e-mail de convite e define a própria senha no primeiro acesso.
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            <label className="block text-[13px] font-medium text-epi-ink">
              Nome completo
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Novo usuário"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@empresa.com.br"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Perfil
              <select
                value={perfil}
                onChange={(event) => setPerfil(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                {PERFIS.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-[13px] font-medium text-epi-ink">Obras permitidas</p>
              <div className="mt-2 max-h-[132px] space-y-2 overflow-y-auto rounded-lg border border-epi-border p-3">
                {obras.length === 0 && <p className="text-sm text-epi-muted">Nenhuma obra cadastrada ainda.</p>}
                {obras.map((obra) => (
                  <label key={obra.id} className="flex items-center gap-2 text-sm text-epi-ink">
                    <input
                      type="checkbox"
                      checked={Boolean(obrasSelecionadas[obra.id])}
                      onChange={() => alternarObra(obra.id)}
                      className="h-4 w-4 accent-epi-brand"
                    />
                    {obra.nome}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-epi-muted">Administrador enxerga todas as obras independente da seleção.</p>
            </div>
          </div>

          {/* EPI-335: como a pessoa vai entrar no sistema */}
          <fieldset className="mt-6 rounded-lg border border-epi-border p-4">
            <legend className="px-1 text-[13px] font-medium text-epi-ink">Primeiro acesso</legend>
            <label className="flex items-start gap-2 text-sm text-epi-ink">
              <input
                type="radio"
                name="modo"
                checked={modo === "convite"}
                onChange={() => setModo("convite")}
                className="mt-1 accent-epi-brand"
              />
              <span>
                <b>Convite por e-mail</b>
                <span className="block text-xs text-epi-muted">A pessoa recebe um e-mail e cria a própria senha.</span>
              </span>
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm text-epi-ink">
              <input
                type="radio"
                name="modo"
                checked={modo === "senha_temporaria"}
                onChange={() => setModo("senha_temporaria")}
                className="mt-1 accent-epi-brand"
              />
              <span>
                <b>Senha temporária</b>
                <span className="block text-xs text-epi-muted">
                  Você define a senha agora e passa para a pessoa. Ela já consegue entrar, recebe um e-mail de aviso e é
                  obrigada a trocar a senha no primeiro acesso.
                </span>
              </span>
            </label>

            {modo === "senha_temporaria" && (
              <div className="mt-4 max-w-[420px]">
                <label className="block text-[13px] font-medium text-epi-ink">
                  Senha temporária
                  <div className="mt-2 flex gap-2">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      autoComplete="new-password"
                      value={senhaTemporaria}
                      onChange={(event) => setSenhaTemporaria(event.target.value)}
                      className="h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((atual) => !atual)}
                      className="rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
                    >
                      {mostrarSenha ? "Ocultar" : "Mostrar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSenhaTemporaria(gerarSenhaTemporaria());
                        setMostrarSenha(true);
                      }}
                      className="whitespace-nowrap rounded-lg border border-epi-brand px-3 text-sm font-semibold text-epi-brand"
                    >
                      Gerar senha
                    </button>
                  </div>
                </label>
                <SenhaRequisitos senha={senhaTemporaria} />
              </div>
            )}
          </fieldset>

          {erro && (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
          )}
          {sucesso && (
            <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">{sucesso}</p>
              {senhaCriada && (
                <p className="mt-2">
                  Senha temporária: <code className="rounded bg-white px-2 py-1 font-mono text-base">{senhaCriada}</code>
                  <span className="block text-xs">Anote agora: ela não aparece de novo.</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
            <button
              type="button"
              onClick={() => navigate("/usuarios")}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : modo === "senha_temporaria" ? "Criar usuário" : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
