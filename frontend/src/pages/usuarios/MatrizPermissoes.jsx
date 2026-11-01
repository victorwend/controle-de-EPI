import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  marcarAcao,
  MATRIZ_PERMISSOES,
  montarEstado,
  PERFIS_CONFIGURAVEIS,
  perfisAlterados,
  permissoesPadrao,
  rotuloPerfil,
} from "../../lib/permissoes.js";

// "O que cada perfil pode fazer" (EPI-331, EPI-333).
//
// EPI-336: para a tela não ficar poluída, a configuração fica fechada
// atrás do botão "Configurar permissões dos perfis". Aberta, primeiro se
// escolhe o PERFIL (botões no topo) e só aparecem as caixinhas dele,
// separadas em "Abas do menu" e "O que pode fazer".
//
// Ao salvar, cada perfil alterado é gravado pela função
// salvar_permissoes_perfil (correções 19 e 20), que confere tudo no banco.

const GRUPOS = [
  { id: "abas", titulo: "Abas do menu", descricao: "O que aparece no menu para este perfil." },
  { id: "acoes", titulo: "O que pode fazer", descricao: "Ações que este perfil pode realizar." },
];

export default function MatrizPermissoes() {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState(PERFIS_CONFIGURAVEIS[0]);
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

  const alterados = atual ? perfisAlterados(salvo, atual) : [];

  function alternar(chave, marcado) {
    setAviso("");
    setErro("");
    setAtual((estado) => marcarAcao(estado, perfil, chave, marcado));
  }

  async function salvar() {
    setErro("");
    setAviso("");
    setSalvando(true);
    for (const perfilAlterado of alterados) {
      const { error } = await supabase.rpc("salvar_permissoes_perfil", {
        p_perfil: perfilAlterado,
        p_acoes: atual[perfilAlterado],
      });
      if (error) {
        setSalvando(false);
        setErro(`Não foi possível salvar o perfil ${rotuloPerfil(perfilAlterado)}: ${error.message}`);
        await carregar();
        return;
      }
    }
    setSalvando(false);
    setAviso("Permissões salvas. Elas valem no próximo acesso de cada usuário (ou ao recarregar a página).");
    await carregar();
  }

  return (
    <section className="mt-10 max-w-[1060px] rounded-xl border border-epi-border bg-white">
      {/* Cabeçalho: abre e fecha a configuração */}
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <span>
          <span className="block text-lg font-semibold text-epi-ink">Permissões dos perfis</span>
          <span className="mt-1 block text-sm text-epi-muted">
            Escolha as abas que cada perfil vê e o que ele pode fazer.
            {alterados.length > 0 && <b className="text-amber-700"> Há alterações não salvas.</b>}
          </span>
        </span>
        <span className="whitespace-nowrap rounded-lg border border-epi-border px-3 py-2 text-sm font-semibold text-epi-ink">
          {aberto ? "Fechar ▲" : "Configurar ▼"}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-epi-border px-6 py-5">
          {!atual ? (
            <p className="text-sm text-epi-muted">{erro || "Carregando permissões..."}</p>
          ) : (
            <>
              {/* Escolha do perfil */}
              <p className="text-[13px] font-medium text-epi-ink">Perfil</p>
              <div className="mt-2 flex flex-wrap gap-2" role="tablist">
                {PERFIS_CONFIGURAVEIS.map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    role="tab"
                    aria-selected={perfil === opcao}
                    onClick={() => setPerfil(opcao)}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      perfil === opcao
                        ? "border-epi-brand bg-epi-brand font-semibold text-white"
                        : "border-epi-border bg-white text-epi-ink hover:bg-epi-paper"
                    }`}
                  >
                    {rotuloPerfil(opcao)}
                    {alterados.includes(opcao) && " •"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-epi-muted">
                O Administrador pode tudo e não precisa de configuração. O ponto (•) marca o perfil com alterações não
                salvas.
              </p>

              {erro && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{erro}</p>}
              {aviso && (
                <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">{aviso}</p>
              )}

              {/* Caixinhas do perfil escolhido */}
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {GRUPOS.map((grupo) => (
                  <div key={grupo.id} className="rounded-lg border border-epi-border p-4">
                    <p className="text-sm font-semibold text-epi-ink">{grupo.titulo}</p>
                    <p className="text-xs text-epi-muted">{grupo.descricao}</p>
                    <div className="mt-3 space-y-3">
                      {MATRIZ_PERMISSOES.filter((linha) => linha.grupo === grupo.id).map((linha) => {
                        const marcado = linha.fixa
                          ? linha.perfis.includes(perfil)
                          : (atual[perfil] ?? []).includes(linha.chave);
                        return (
                          <label
                            key={linha.acao}
                            className={`flex items-start gap-3 text-sm ${linha.fixa ? "text-epi-muted" : "text-epi-ink"}`}
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={linha.fixa || salvando}
                              onChange={(event) => alternar(linha.chave, event.target.checked)}
                              className="mt-0.5 h-4 w-4 accent-epi-brand disabled:opacity-50"
                            />
                            <span>
                              {linha.acao}
                              <span className="block text-xs text-epi-muted">{linha.detalhe}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-epi-muted">
                Dar uma ação libera a aba dela junto (ex.: &quot;Entregar EPI&quot; marca a aba &quot;Entregas de EPI&quot;).
                Fora quem tem &quot;Ver todas as obras&quot;, cada usuário só age nas obras liberadas para ele.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-epi-border pt-4">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    setAviso("");
                    setAtual((estado) => ({ ...estado, [perfil]: permissoesPadrao()[perfil] }));
                  }}
                  className="text-sm font-semibold text-epi-muted hover:text-epi-ink"
                >
                  Voltar ao padrão deste perfil
                </button>
                <div className="flex items-center gap-3">
                  {alterados.length > 0 && (
                    <span className="text-sm text-epi-muted">
                      Não salvo: {alterados.map((item) => rotuloPerfil(item)).join(", ")}
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
            </>
          )}
        </div>
      )}
    </section>
  );
}
