import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { hojeIso } from "../../lib/funcionarios.js";

// Transferir o funcionário de obra (EPI-339). Só o Administrador.
// A função transferir_funcionario (correção 23) muda a obra e grava a
// transferência no histórico numa operação só. As entregas antigas
// continuam marcadas com a obra em que foram feitas.
export default function TransferirFuncionario({ funcionario, obraAtualId, onCancelar, onTransferido }) {
  const [obras, setObras] = useState([]);
  const [obraDestino, setObraDestino] = useState("");
  const [data, setData] = useState(hojeIso());
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase
      .from("obras")
      .select("id, nome")
      .eq("status", "ativa")
      .order("nome")
      .then(({ data: lista }) => setObras((lista ?? []).filter((obra) => obra.id !== obraAtualId)));
  }, [obraAtualId]);

  async function transferir(event) {
    event.preventDefault();
    setErro("");
    if (!obraDestino) {
      setErro("Escolha a obra de destino.");
      return;
    }
    if (!data || data > hojeIso()) {
      setErro("A data da transferência não pode ser no futuro.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc("transferir_funcionario", {
      p_funcionario_id: funcionario.id,
      p_obra_destino_id: obraDestino,
      p_data: data,
      p_motivo: motivo.trim() || null,
    });
    setSalvando(false);
    if (error) {
      setErro(error.message || "Não foi possível transferir.");
      return;
    }
    const nomeDestino = obras.find((obra) => obra.id === obraDestino)?.nome ?? "";
    onTransferido(`${funcionario.nome} foi transferido para ${nomeDestino}.`);
  }

  return (
    <form onSubmit={transferir} className="mb-6 max-w-[1060px] rounded-xl border border-epi-brand bg-white p-6">
      <h3 className="text-sm font-semibold text-epi-ink">Transferir de obra</h3>
      <p className="mt-1 text-sm text-epi-muted">
        Obra atual: <b>{funcionario.obras?.nome ?? "sem obra (sede)"}</b>. Os EPIs em posse, a função e a ficha vão junto. O
        histórico continua mostrando em qual obra cada EPI foi entregue.
      </p>

      {erro && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block text-[13px] font-medium text-epi-ink">
          Obra de destino
          <select
            value={obraDestino}
            onChange={(event) => setObraDestino(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
          >
            <option value="">Escolha...</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-epi-ink">
          Data da transferência
          <input
            type="date"
            value={data}
            max={hojeIso()}
            onChange={(event) => setData(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
          />
        </label>
        <label className="block text-[13px] font-medium text-epi-ink">
          Motivo (opcional)
          <input
            type="text"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder="Ex.: remanejamento de equipe"
            className="mt-2 h-10 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={onCancelar} className="rounded-lg border border-epi-border px-4 py-2 text-sm font-medium text-epi-ink">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? "Transferindo..." : "Confirmar transferência"}
        </button>
      </div>
    </form>
  );
}
