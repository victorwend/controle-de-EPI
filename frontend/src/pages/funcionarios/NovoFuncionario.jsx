import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";

const VALIDACOES_PENDENTES = [
  "Quais dados são obrigatórios?",
  "Matrícula vem de outro sistema?",
  "Funcionário pode trocar de obra?",
  "Precisa importar planilha?",
  "Quem pode editar cadastro?",
];

export default function NovoFuncionario() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [cpf, setCpf] = useState("");
  const [funcao, setFuncao] = useState("");
  const [obraId, setObraId] = useState("");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [setor, setSetor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!nome.trim() || !matricula.trim() || !obraId) {
      setErro("Preencha nome, matrícula e obra.");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.from("funcionarios").insert({
      empresa_id: usuario.empresa_id,
      nome: nome.trim(),
      matricula: matricula.trim(),
      cpf: cpf.trim() || null,
      funcao: funcao.trim() || null,
      setor: setor.trim() || null,
      obra_id: obraId,
      data_admissao: dataAdmissao || null,
      observacoes: observacoes.trim() || null,
    });

    setLoading(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um funcionário com essa matrícula."
          : error.message || "Não foi possível cadastrar o funcionário."
      );
      return;
    }

    navigate("/funcionarios");
  }

  function abrirCadastroBiometria() {
    navigate("/cadastros/biometria", {
      state: {
        origem: "novo-funcionario",
        funcionario: {
          nome: nome || "Novo funcionário",
          matricula: matricula || "—",
          obra: obras.find((obra) => obra.id === obraId)?.nome || "—",
        },
      },
    });
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Novo funcionário</h2>
        <p className="mt-1 text-sm text-epi-muted">Cadastre os dados mínimos necessários para vincular entregas de EPI.</p>
      </div>

      <div className="grid max-w-[1060px] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-epi-border bg-white p-8">
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              Nome completo *
              <input
                type="text"
                required
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="João Carlos da Silva"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Matrícula *
              <input
                type="text"
                required
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder="00487"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              CPF
              <input
                type="text"
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                placeholder="000.000.000-00"
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Função
              <input
                type="text"
                value={funcao}
                onChange={(event) => setFuncao(event.target.value)}
                placeholder="Servente, Pedreiro, Operador..."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Obra *
              <select
                required
                value={obraId}
                onChange={(event) => setObraId(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  Selecione a obra
                </option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Data de admissão
              <input
                type="date"
                value={dataAdmissao}
                onChange={(event) => setDataAdmissao(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink">
              Setor
              <input
                type="text"
                value={setor}
                onChange={(event) => setSetor(event.target.value)}
                placeholder="Obra, Administrativo..."
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-medium text-epi-ink md:col-span-2">
              Observações
              <textarea
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-epi-border px-3 py-2 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>
          </div>

          {erro && (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
            <button
              type="button"
              onClick={() => navigate("/funcionarios")}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar funcionário"}
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-epi-border bg-white p-6">
          <h3 className="text-sm font-semibold text-epi-ink">Validação necessária</h3>
          <ul className="mt-3 space-y-2 text-sm text-epi-muted">
            {VALIDACOES_PENDENTES.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="mt-6 max-w-[1060px] rounded-xl border border-epi-border bg-white p-6">
        <h3 className="text-base font-semibold text-epi-ink">Biometria</h3>
        <p className="mt-1 text-sm text-epi-muted">Cadastre a digital do funcionário para confirmar futuras entregas de EPI.</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-epi-border bg-epi-paper p-4">
            <p className="text-sm font-medium text-epi-ink">Status da biometria</p>
            <p className="mt-1 text-sm font-semibold text-orange-600">Não cadastrada</p>
            <p className="mt-1 text-xs text-epi-muted">Cadastre antes da primeira entrega.</p>
          </div>
          <div className="rounded-lg border border-epi-border p-4">
            <p className="text-sm font-medium text-epi-ink">Cadastrar biometria</p>
            <p className="mt-1 text-xs text-epi-muted">Posicione o dedo no leitor biométrico conectado ao sistema.</p>
            <button
              type="button"
              onClick={abrirCadastroBiometria}
              className="mt-3 rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Cadastrar biometria
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
