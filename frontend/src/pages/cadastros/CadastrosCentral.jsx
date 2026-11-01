import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";

// Destinos extraídos do Dev Mode do Figma (cada bloco navega direto para o
// formulário de criação daquele cadastro, não para uma lista). Onde o
// cadastro real ainda não existe, aponta para o placeholder do módulo.
//
// EPI-323 (31/10/2026): saiu daqui tudo o que já tem caminho pelo menu
// lateral, para cada cadastro ter um caminho só:
//   - Funcionários, EPIs e CAs, Obras -> menus próprios (lista + novo);
//   - Locais de estoque               -> menu Estoque (botão "Locais de estoque");
//   - Matriz EPI x Função             -> menu EPIs e CAs (botão "Matriz EPI x Função").
// Fica aqui só o que não tem outro caminho. Diverge do protótipo 09.01 do
// Figma, que precisa ser atualizado.
const TILES = [
  { label: "Fornecedores", to: "/cadastros/fornecedor" },
  { label: "Cargos / Funções", to: "/cadastros/cargo" },
  { label: "Setores / Centros de custo", to: "/cadastros/setor" },
  { label: "Usuários e permissões", to: "/usuarios" },
  { label: "Categorias de EPI", to: "/cadastros/categoria-epi" },
  { label: "Motivos de movimentação", to: "/cadastros/motivo-movimentacao" },
  { label: "Cadastrar biometria", to: "/cadastros/biometria" },
];

export default function CadastrosCentral() {
  return (
    <AppShell title="Cadastros" subtitle="Cadastro e manutenção de dados mestres." activeSection="Cadastros">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10">
        <h2 className="text-xl font-semibold text-epi-ink">Cadastros</h2>
        <p className="mt-1 text-sm text-epi-muted">
          Tabelas de apoio usadas pelo sistema. O que já tem menu próprio (Funcionários, EPIs e CAs, Obras e
          Estoque) é cadastrado por lá.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {TILES.map((tile) => (
            <Link
              key={tile.label}
              to={tile.to}
              className="rounded-lg border border-epi-border bg-[#EBF5F0] px-5 py-4 hover:opacity-90"
            >
              <p className="text-sm font-semibold text-epi-ink">{tile.label}</p>
              <p className="mt-0.5 text-xs text-epi-muted">Abrir cadastro →</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
