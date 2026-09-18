import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";

// RN079 deixa o prazo de antecedência do alerta de CA como "configurável",
// ainda sem valor definido (ver docs/02-requisitos/regras-de-negocio.md).
// 60 dias é um default provisório até isso virar campo de configuração real.
const DIAS_PARA_VENCER = 60;

function calcularStatus(validadeCA) {
  const hoje = new Date();
  const validade = new Date(`${validadeCA}T00:00:00`);
  const diffDias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return "Vencido";
  if (diffDias <= DIAS_PARA_VENCER) return "A vencer";
  return "Válido";
}

function formatarData(validadeCA) {
  return new Date(`${validadeCA}T00:00:00`).toLocaleDateString("pt-BR");
}

export default function EpisLista() {
  const [busca, setBusca] = useState("");
  const [validadeFiltro, setValidadeFiltro] = useState("");
  const [epis, setEpis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("epis")
      .select("id, nome, categoria, ca, fabricante, validade_ca, periodicidade_troca")
      .order("nome")
      .then(({ data }) => {
        if (!ativo) return;
        setEpis((data ?? []).map((epi) => ({ ...epi, status: calcularStatus(epi.validade_ca) })));
        setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const episFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return epis.filter((epi) => {
      const bateBusca =
        !termo ||
        epi.nome.toLowerCase().includes(termo) ||
        epi.ca.includes(termo) ||
        (epi.fabricante ?? "").toLowerCase().includes(termo);
      const bateValidade = !validadeFiltro || epi.status === validadeFiltro;
      return bateBusca && bateValidade;
    });
  }, [busca, validadeFiltro, epis]);

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="EPIs e CAs">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-epi-ink">EPIs e Certificados de Aprovação</h2>
          <p className="mt-1 text-sm text-epi-muted">Cadastre os equipamentos e acompanhe validade dos CAs.</p>
        </div>
        <Link
          to="/epis-cas/novo"
          className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Novo EPI
        </Link>
      </div>

      <div className="mb-4 flex max-w-[1060px] gap-3">
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar EPI, CA ou fabricante..."
          className="h-11 flex-1 rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
        />
        <select
          value={validadeFiltro}
          onChange={(event) => setValidadeFiltro(event.target.value)}
          className="h-11 w-52 rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
        >
          <option value="">Todas as validades</option>
          <option value="Válido">Válido</option>
          <option value="A vencer">A vencer</option>
          <option value="Vencido">Vencido</option>
        </select>
      </div>

      <div className="max-w-[1060px] overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-epi-border text-xs uppercase text-epi-muted">
              <th className="px-4 py-3 font-medium">EPI</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">CA</th>
              <th className="px-4 py-3 font-medium">Fabricante</th>
              <th className="px-4 py-3 font-medium">Validade CA</th>
              <th className="px-4 py-3 font-medium">Periodicidade</th>
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
              episFiltrados.map((epi) => (
                <tr key={epi.id} className="border-b border-epi-border last:border-0">
                  <td className="px-4 py-3 font-medium text-epi-ink">{epi.nome}</td>
                  <td className="px-4 py-3 text-epi-muted">{epi.categoria || "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{epi.ca}</td>
                  <td className="px-4 py-3 text-epi-muted">{epi.fabricante || "—"}</td>
                  <td className="px-4 py-3 text-epi-muted">{formatarData(epi.validade_ca)}</td>
                  <td className="px-4 py-3 text-epi-muted">{epi.periodicidade_troca || "—"}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      epi.status === "Vencido"
                        ? "text-red-600"
                        : epi.status === "A vencer"
                          ? "text-orange-600"
                          : "text-epi-muted"
                    }`}
                  >
                    {epi.status}
                  </td>
                </tr>
              ))}
            {!loading && episFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-epi-muted">
                  Nenhum EPI encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 max-w-[1060px] text-sm text-epi-muted">
        Validações com usuários: nomenclatura do EPI, necessidade de foto, periodicidade de troca e regra de CA.
      </p>
    </AppShell>
  );
}
