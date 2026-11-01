import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { contarInativos, filtrarFuncionarios } from "../../lib/funcionarios.js";
import { formatarData } from "../../lib/termoRecebimento.js";
import SePuder from "../../components/SePuder.jsx";

// EPI-330: funcionário INATIVO (desligado) não aparece na lista nem na
// busca; só com o filtro "Mostrar inativos". Para inativar, abra a ficha.

export default function FuncionariosLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const [{ data: funcionariosData }, { data: obrasData }] = await Promise.all([
        supabase
          .from("funcionarios")
          .select("id, matricula, nome, funcao, status, data_desligamento, obra_id, obras(nome)")
          .order("nome"),
        supabase.from("obras").select("id, nome").order("nome"),
      ]);

      if (!ativo) return;
      setFuncionarios(funcionariosData ?? []);
      setObras(obrasData ?? []);
      setLoading(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const funcionariosFiltrados = useMemo(
    () => filtrarFuncionarios(funcionarios, { busca, obraId: obraFiltro, mostrarInativos }),
    [busca, obraFiltro, mostrarInativos, funcionarios]
  );
  const quantidadeInativos = contarInativos(funcionarios);

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Funcionários</h2>
          <p className="mt-1 text-sm text-epi-muted">Cadastre colaboradores e acompanhe o histórico de EPIs.</p>
        </div>
        <div className="flex gap-3">
          <SePuder acao="gerenciar_funcionarios">
            <Link
              to="/funcionarios/importar"
              className="rounded-lg border border-epi-brand px-4 py-2.5 text-sm font-semibold text-epi-brand hover:bg-epi-paper"
            >
              Importar planilha
            </Link>
          </SePuder>
          <SePuder acao="gerenciar_funcionarios">
            <Link
              to="/funcionarios/novo"
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              + Novo funcionário
            </Link>
          </SePuder>
        </div>
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar nome, matrícula ou função..."
          className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
        />
        <select
          value={obraFiltro}
          onChange={(event) => setObraFiltro(event.target.value)}
          className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
        >
          <option value="">Todas as obras</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
        <label className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-epi-border px-3 text-sm text-epi-ink">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(event) => setMostrarInativos(event.target.checked)}
            className="h-4 w-4 accent-epi-brand"
          />
          Mostrar inativos ({quantidadeInativos})
        </label>
      </div>

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3 font-medium">Função</th>
              <th className="px-4 py-3 font-medium">Obra</th>
              <th className="px-4 py-3 font-medium">EPIs ativos</th>
              <th className="px-4 py-3 font-medium">Pendências</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading &&
              funcionariosFiltrados.map((funcionario) => (
                <tr
                  key={funcionario.id}
                  className={`border-b border-epi-border last:border-0 ${funcionario.status === "ativo" ? "" : "bg-epi-paper"}`}
                >
                  <td className="px-4 py-3">
                    <Link to={`/funcionarios/${funcionario.matricula}`} className="font-medium text-epi-ink hover:text-epi-brand">
                      {funcionario.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-epi-muted">{funcionario.matricula}</td>
                  <td className="px-4 py-3 text-epi-muted">{funcionario.funcao || "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{funcionario.obras?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">0</td>
                  <td className="px-4 py-3 text-epi-muted">0</td>
                  <td className={`px-4 py-3 font-medium ${funcionario.status === "ativo" ? "text-green-700" : "text-epi-muted"}`}>
                    {funcionario.status === "ativo" ? "Ativo" : "Inativo"}
                    {funcionario.status !== "ativo" && funcionario.data_desligamento && (
                      <span className="block text-xs font-normal">desde {formatarData(funcionario.data_desligamento)}</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && funcionariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  {!mostrarInativos && quantidadeInativos > 0
                    ? "Nenhum funcionário ativo encontrado. Marque \"Mostrar inativos\" para procurar entre os desligados."
                    : "Nenhum funcionário encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Clique em um funcionário para abrir ficha, histórico e pendências. Para registrar um desligamento, abra a
        ficha e use <b>Inativar</b>. "EPIs ativos" e "Pendências" ainda
        mostram 0 — dependem do módulo de Entregas, que ainda não foi migrado do mock.
      </p>
    </AppShell>
  );
}
