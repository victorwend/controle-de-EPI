import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext.jsx";

export default function NovaObra() {
  const navigate = useNavigate();
  const { usuario, temObra, refreshTemObra } = useAuth();

  const [nomeObra, setNomeObra] = useState("");
  const [codigo, setCodigo] = useState("");
  const [centroCusto, setCentroCusto] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [cidadeUf, setCidadeUf] = useState("");
  const [status, setStatus] = useState("ativa");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!nomeObra.trim()) {
      setErro("Informe o nome da obra.");
      return;
    }

    setErro("");
    setLoading(true);

    const { error } = await supabase.from("obras").insert({
      empresa_id: usuario.empresa_id,
      nome: nomeObra.trim(),
      codigo: codigo.trim() || null,
      centro_custo: centroCusto.trim() || null,
      cidade_uf: cidadeUf.trim() || null,
      responsavel_nome: responsavelNome.trim() || null,
      status,
    });

    setLoading(false);

    if (error) {
      setErro(error.message || "Não foi possível cadastrar a obra.");
      return;
    }

    await refreshTemObra();
    navigate("/visao-geral");
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-epi-paper p-6">
      <div className="mb-8 text-center">
        <p className="text-[22px] font-semibold leading-none text-epi-ink">PAVIDEZ</p>
        <p className="mt-1 text-[11px] font-semibold tracking-wide text-epi-muted">
          CONTROLE DE EPI
        </p>
      </div>

      <div className="w-full max-w-[640px] rounded-[20px] border border-epi-border bg-white p-8 md:p-12">
        <h2 className="text-[26px] font-semibold leading-tight text-epi-ink">
          {temObra ? "Cadastrar nova obra" : "Cadastre sua primeira obra"}
        </h2>
        <p className="mt-2 text-[15px] text-epi-muted">
          {temObra
            ? "Dados para vincular funcionários, estoque e entregas."
            : "Sua empresa ainda não tem nenhuma obra — é o primeiro passo antes de cadastrar funcionários, estoque e entregas."}
        </p>

        <form className="mt-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-[13px] font-semibold text-epi-ink">
              Nome da obra
              <input
                type="text"
                value={nomeObra}
                onChange={(event) => setNomeObra(event.target.value)}
                placeholder="Obra BR-040"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-semibold text-epi-ink">
              Código
              <input
                type="text"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder="OBR-001"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-semibold text-epi-ink">
              Centro de custo
              <input
                type="text"
                value={centroCusto}
                onChange={(event) => setCentroCusto(event.target.value)}
                placeholder="CC-101"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-semibold text-epi-ink">
              Cidade / UF
              <input
                type="text"
                value={cidadeUf}
                onChange={(event) => setCidadeUf(event.target.value)}
                placeholder="João Pinheiro / MG"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-semibold text-epi-ink">
              Responsável
              <input
                type="text"
                value={responsavelNome}
                onChange={(event) => setResponsavelNome(event.target.value)}
                placeholder="Nome do responsável (sem cadastro de funcionários ainda)"
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            </label>

            <label className="block text-[13px] font-semibold text-epi-ink">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-2 h-[48px] w-full rounded-[10px] border border-epi-border px-4 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </label>
          </div>

          {erro && (
            <p className="mt-6 rounded-[10px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {erro}
            </p>
          )}

          <div className="mt-8 flex items-center justify-end gap-3">
            {temObra && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="h-[48px] rounded-[10px] bg-epi-brand px-6 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar obra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
