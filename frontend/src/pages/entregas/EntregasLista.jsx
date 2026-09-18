import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

function formatarData(dataIso) {
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

export default function EntregasLista() {
  const [busca, setBusca] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase
        .from("entrega_itens")
        .select(
          "id, quantidade, epis(nome, ca), entregas(created_at, status, funcionarios(nome, matricula, obras(id, nome)))"
        )
        .order("id", { ascending: false }),
      supabase.from("obras").select("id, nome").order("nome"),
    ]).then(([{ data: itensData }, { data: obrasData }]) => {
      if (!ativo) return;
      setLinhas(itensData ?? []);
      setObras(obrasData ?? []);
      setLoading(false);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((linha) => {
      const funcionarioNome = linha.entregas?.funcionarios?.nome ?? "";
      const epiNome = linha.epis?.nome ?? "";
      const bateBusca =
        !termo || funcionarioNome.toLowerCase().includes(termo) || epiNome.toLowerCase().includes(termo);
      const obraId = linha.entregas?.funcionarios?.obras?.id;
      const bateObra = !obraFiltro || obraId === obraFiltro;
      return bateBusca && bateObra;
    });
  }, [busca, obraFiltro, linhas]);

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Entregas de EPI">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">Entregas de EPI</h2>
          <p className="mt-1 text-sm text-epi-muted">Consulte e registre todas as entregas realizadas aos colaboradores.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/entregas/troca-devolucao"
            className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Troca / devolução
          </Link>
          <Link
            to="/entregas/lote"
            className="rounded-lg border border-epi-border bg-white px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Entrega em lote
          </Link>
          <Link
            to="/entregas/nova"
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Nova entrega
          </Link>
        </div>
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar funcionário ou EPI..."
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
        <select className="h-11 w-44 rounded-lg border border-epi-border px-3 text-sm text-epi-ink" defaultValue="30">
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">EPI</th>
              <th className="px-4 py-3 font-medium">CA</th>
              <th className="px-4 py-3 font-medium">Obra</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Qtd.</th>
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
              linhasFiltradas.map((linha) => (
                <tr key={linha.id} className="border-b border-epi-border last:border-0">
                  <td className="px-4 py-3 font-medium text-epi-ink">{linha.entregas?.funcionarios?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{linha.epis?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{linha.epis?.ca ?? "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{linha.entregas?.funcionarios?.obras?.nome ?? "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">
                    {linha.entregas?.created_at ? formatarData(linha.entregas.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-epi-muted">{linha.quantidade}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      linha.entregas?.status === "pendente" ? "text-orange-600" : "text-epi-muted"
                    }`}
                  >
                    {linha.entregas?.status === "pendente" ? "Pendente" : "Confirmada"}
                  </td>
                </tr>
              ))}
            {!loading && linhasFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Nenhuma entrega encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Mostrando {linhasFiltradas.length} de {linhas.length} entregas.
      </p>
      <p className="mt-1 max-w-[1060px] text-sm text-epi-muted">
        Validação automática de estoque: a entrega é bloqueada quando não houver quantidade suficiente.
      </p>
    </AppShell>
  );
}
