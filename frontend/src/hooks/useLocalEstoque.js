import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { escolherLocalPadrao } from "../lib/locaisEstoque";

// Hook usado nas telas que tiram ou devolvem EPI ao estoque (EPI-325):
// Nova entrega, Entrega em lote e Troca/devolução.
//
// - Carrega os locais de estoque ATIVOS da empresa.
// - Já deixa um local escolhido (ver escolherLocalPadrao).
// - Sempre que o local muda, recarrega o saldo de cada EPI naquele local.
//
// Antes desta tarefa, as 3 telas procuravam o local pelo nome fixo
// "Almoxarifado Central" e não deixavam escolher outro.
export function useLocalEstoque() {
  const [locais, setLocais] = useState([]);
  const [localId, setLocalId] = useState("");
  const [saldoMap, setSaldoMap] = useState({});
  const [carregandoLocais, setCarregandoLocais] = useState(true);
  const [carregandoSaldo, setCarregandoSaldo] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase
      .from("locais_estoque")
      .select("id, nome, status, obra_id")
      .eq("status", "ativo")
      .order("nome")
      .then(({ data }) => {
        if (!ativo) return;
        const lista = data ?? [];
        setLocais(lista);
        setLocalId(escolherLocalPadrao(lista)?.id ?? "");
        setCarregandoLocais(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    let ativo = true;
    if (!localId) {
      setSaldoMap({});
      return undefined;
    }
    setCarregandoSaldo(true);
    supabase
      .from("saldo_estoque")
      .select("epi_id, saldo")
      .eq("local_id", localId)
      .then(({ data }) => {
        if (!ativo) return;
        setSaldoMap(Object.fromEntries((data ?? []).map((linha) => [linha.epi_id, linha.saldo])));
        setCarregandoSaldo(false);
      });
    return () => {
      ativo = false;
    };
  }, [localId]);

  const local = locais.find((item) => item.id === localId) ?? null;

  return { locais, local, localId, setLocalId, saldoMap, carregandoLocais, carregandoSaldo };
}
