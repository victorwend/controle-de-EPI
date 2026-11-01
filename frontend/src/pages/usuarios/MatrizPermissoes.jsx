import { Fragment, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  marcarAcao,
  MATRIZ_PERMISSOES,
  montarEstado,
  PERFIS,
  perfisAlterados,
  permissoesPadrao,
  rotuloPerfil,
} from "../../lib/permissoes.js";

// "O que cada perfil pode fazer" com caixinhas (EPI-331).
//
// O Administrador marca/desmarca e clica em Salvar. Cada perfil alterado
// é gravado pela função salvar_permissoes_perfil (correção 19), que
// confere tudo de novo no banco. Linhas "fixas" não têm caixinha.

const TITULOS_GRUPO = {
  abas: "Abas do menu (o que aparece para o perfil)",
  acoes: "O que o perfil pode fazer",
};

export default function MatrizPermissoes() {
  const [salvo, setSalvo] = useState(null);
  const [atual, setAtual] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  async function carregar() {
    const { data, error } = await supabase.from("permissoes_perfil").select("perfil, acao");
    if (error) {
      setErro("Não foi possível carregar as permissões: " + error.message);
      return;
    }
    const estado = montarEstado(data);
    setSalvo(estado);
    setAtual(estado);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (!atual) {
    return (
      <section className="mt-10 max-w-[1060px] text-sm text-epi-muted">
        {erro || "Carregando permissões..."}
      </section>
    );
  }

  const alterados = perfisAlterados(salvo, atual);

  function alternar(perfil, chave, marcado) {
    setAviso("");
    setErro("");
    setAtual((estado) => marcarAcao(estado, perfil, chave, marcado));
  }

  async function salvar() {
    setErro("");
    setAviso("");
    setSalvando(true);
    for (const perfil of alterados) {
      const { error } = await supabase.rpc("salvar_permissoes_perfil", { p_perfil: perfil, p_acoes: atual[perfil] });
      if (error) {
        setSalvando(false);
        setErro(`Não foi possível salvar o perfil ${rotuloPerfil(perfil)}: ${error.message}`);
        await carregar();
        return;
      }
    }
    setSalvando(false);
    setAviso("Permissões salvas. Elas valem no próximo acesso de cada usuário (ou ao recarregar a página).");
    await carregar();
  }

  return (
    <section className="mt-10 max-w-[1060px]">
      <h2 className="text-lg font-semibold text-epi-ink">O que cada perfil pode fazer</h2>
      <p className="mt-1 text-sm text-epi-muted">
        Marque as <b>abas</b> que cada perfil vê no menu e o que ele <b>pode fazer</b>, e clique em{" "}
        <b>Salvar permissões</b>. Aba desmarcada some do menu. Dar uma ação libera a aba dela junto. O Administrador
        sempre pode tudo. As linhas sem caixinha são fixas, por segurança. Fora quem tem &quot;Ver todas as obras&quot;, cada usuário só age nas
        obras liberadas para ele.
      </p>

      {erro && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}
      {aviso && <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-epi-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-epi-border text-xs uppercase text-epi-muted">
            <tr>
              <th className="px-4 py-3">Ação</th>
              {PERFIS.map((perfil) => (
                <th key={perfil.valor} className="px-4 py-3 text-center">
                  {perfil.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIZ_PERMISSOES.map((linha, indice) => (
              <Fragment key={linha.acao}>
                {/* EPI-333: título de cada grupo (abas do menu / o que pode fazer) */}
                {MATRIZ_PERMISSOES[indice - 1]?.grupo !== linha.grupo && (
                  <tr className="border-b border-epi-border bg-epi-paper">
                    <td colSpan={PERFIS.length + 1} className="px-4 py-2 text-xs font-semibold uppercase text-epi-muted">
                      {TITULOS_GRUPO[linha.grupo]}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-epi-border last:border-0">
                  <td className="px-4 py-3 text-epi-ink">
                    {linha.acao}
                    <span className="block text-xs text-epi-muted">{linha.detalhe}</span>
                  </td>
                  {PERFIS.map((perfil) => {
                    const fixo = linha.fixa || perfil.valor === "administrador";
                    const marcado = linha.fixa
                      ? linha.perfis.includes(perfil.valor)
                      : perfil.valor === "administrador" || (atual[perfil.valor] ?? []).includes(linha.chave);
                    return (
                      <td key={perfil.valor} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={marcado}
                          disabled={fixo || salvando}
                          title={fixo ? "Fixo: não pode ser alterado" : ""}
                          aria-label={`${linha.acao} — ${perfil.label}`}
                          onChange={(event) => alternar(perfil.valor, linha.chave, event.target.checked)}
                          className="h-4 w-4 accent-epi-brand disabled:opacity-50"
                        />
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            setAviso("");
            setAtual(permissoesPadrao());
          }}
          className="text-sm font-semibold text-epi-muted hover:text-epi-ink"
        >
          Voltar ao padrão
        </button>
        <div className="flex items-center gap-3">
          {alterados.length > 0 && (
            <span className="text-sm text-epi-muted">
              Alterações não salvas: {alterados.map((perfil) => rotuloPerfil(perfil)).join(", ")}
            </span>
          )}
          <button
            type="button"
            disabled={salvando || alterados.length === 0}
            onClick={() => setAtual(salvo)}
            className="rounded-lg border border-epi-border px-4 py-2 text-sm font-medium text-epi-ink disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={salvando || alterados.length === 0}
            onClick={salvar}
            className="rounded-lg bg-epi-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </div>
    </section>
  );
}
