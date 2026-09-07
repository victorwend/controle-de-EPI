import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { FUNCIONARIOS } from "../../data/funcionariosConfig.js";
import { OBRAS_RESUMO } from "../../data/obrasConfig.js";

export default function FuncionariosLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");

  const funcionariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return FUNCIONARIOS.filter((funcionario) => {
      const bateBusca =
        !termo ||
        funcionario.nome.toLowerCase().includes(termo) ||
        funcionario.matricula.includes(termo) ||
        funcionario.funcao.toLowerCase().includes(termo);
      const bateObra = !obraFiltro || funcionario.obra === obraFiltro;
      return bateBusca && bateObra;
    });
  }, [busca, obraFiltro]);

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Funcionários">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Funcionários</h2>
          <p className="mt-1 text-sm text-epi-muted">Cadastre colaboradores e acompanhe o histórico de EPIs.</p>
        </div>
        <Link
          to="/funcionarios/novo"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Novo funcionário
        </Link>
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
          {OBRAS_RESUMO.map((obra) => (
            <option key={obra.slug} value={obra.nome.split(" — ")[0]}>
              {obra.nome}
            </option>
          ))}
        </select>
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
            {funcionariosFiltrados.map((funcionario) => (
              <tr key={funcionario.matricula} className="border-b border-epi-border last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/funcionarios/${funcionario.matricula}`} className="font-medium text-epi-ink hover:text-epi-brand">
                    {funcionario.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.matricula}</td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.funcao}</td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.obra}</td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.episAtivos}</td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.pendencias}</td>
                <td className="px-4 py-3 text-epi-muted">{funcionario.status}</td>
              </tr>
            ))}
            {funcionariosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Nenhum funcionário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Clique em um funcionário para abrir ficha, histórico e pendências.
      </p>
    </AppShell>
  );
}
