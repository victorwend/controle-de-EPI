import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";

export default function NovoLocalEstoque() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [obraId, setObraId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [permiteTransferencia, setPermiteTransferencia] = useState("Sim");
  const [status, setStatus] = useState("ativo");
  const [obras, setObras] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    Promise.all([
      supabase.from("obras").select("id, nome").order("nome"),
      supabase.from("funcionarios").select("id, nome").order("nome"),
    ]).then(([{ data: obrasData }, { data: funcionariosData }]) => {
      if (!ativo) return;
      setObras(obrasData ?? []);
      setFuncionarios(funcionariosData ?? []);
    });
    return () => {
      ativo = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!nome.trim()) {
      setErro("Informe o nome do local.");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.from("locais_estoque").insert({
      empresa_id: usuario.empresa_id,
      nome: nome.trim(),
      codigo: codigo.trim() || null,
      obra_id: obraId || null,
      responsavel_id: responsavelId || null,
      permite_transferencia: permiteTransferencia === "Sim",
      status,
    });

    setLoading(false);

    if (error) {
      setErro(
        error.code === "23505"
          ? "Já existe um local com esse código."
          : error.message || "Não foi possível cadastrar o local."
      );
      return;
    }

    navigate("/estoque");
  }

  return (
    <AppShell title="Controle de Equipamentos de Proteção Individual" activeSection="Estoque">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-epi-ink">Cadastro de local de estoque</h2>
        <p className="mt-1 text-sm text-epi-muted">Locais físicos usados para saldo e movimentação dos EPIs.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <label className="block text-[13px] font-medium text-epi-ink">
            Nome *
            <input
              type="text"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Almoxarifado Central"
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Código
            <input
              type="text"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              placeholder="EST-001"
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
            />
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Obra
            <select
              value={obraId}
              onChange={(event) => setObraId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="">Nenhuma (local central)</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Responsável
            <select
              value={responsavelId}
              onChange={(event) => setResponsavelId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="">Selecione</option>
              {funcionarios.map((funcionario) => (
                <option key={funcionario.id} value={funcionario.id}>
                  {funcionario.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Permite transferência
            <select
              value={permiteTransferencia}
              onChange={(event) => setPermiteTransferencia(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </label>

          <label className="block text-[13px] font-medium text-epi-ink">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </label>
        </div>

        {erro && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-epi-border pt-6">
          <button
            type="button"
            onClick={() => navigate("/estoque")}
            className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar local"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
