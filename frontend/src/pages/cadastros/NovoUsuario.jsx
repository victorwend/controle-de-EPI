import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";

const PERFIS = [
  { valor: "operador", label: "Operador" },
  { valor: "almoxarife", label: "Almoxarife" },
  { valor: "tecnico_seguranca", label: "Técnico de Segurança" },
  { valor: "gestor", label: "Gestor" },
  { valor: "administrador", label: "Administrador" },
];

export default function NovoUsuario() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [perfil, setPerfil] = useState("operador");
  const [obras, setObras] = useState([]);
  const [obrasSelecionadas, setObrasSelecionadas] = useState({});
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

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

    setErro("");
    setLoading(true);

    const obraIds = Object.keys(obrasSelecionadas).filter((id) => obrasSelecionadas[id]);

    const { data, error } = await supabase.functions.invoke("convidar-usuario", {
      body: {
        nome: nome.trim(),
        email: email.trim(),
        perfil,
        obraIds,
        redirectTo: `${window.location.origin}/definir-senha`,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      setErro(data?.error || error?.message || "Não foi possível enviar o convite.");
      return;
    }

    setSucesso(true);
    setNome("");
    setEmail("");
    setPerfil("operador");
    setObrasSelecionadas({});
  }

  if (usuario && usuario.perfil !== "administrador") {
    return (
      <AppShell title="Cadastro de usuário" activeSection="Cadastros">
        <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-6 text-sm text-epi-muted">
          Só o Administrador da empresa pode convidar novos usuários.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Cadastro de usuário" subtitle="Controle quem pode acessar o sistema e suas permissões." activeSection="Cadastros">
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

          {erro && (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
          )}
          {sucesso && (
            <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              Convite enviado! A pessoa vai receber um e-mail para definir a senha.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
            <button
              type="button"
              onClick={() => navigate("/cadastros")}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar convite"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
