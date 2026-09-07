import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";

// Destinos extraídos do Dev Mode do Figma (cada bloco navega direto para o
// formulário de criação daquele cadastro, não para uma lista). Onde o
// cadastro real ainda não existe, aponta para o placeholder do módulo.
const TILES = [
  { label: "Funcionários", to: "/funcionarios" },
  { label: "EPIs e CAs", to: "/epis-cas" },
  { label: "Obras", to: "/cadastros/obra" },
  { label: "Fornecedores", to: "/cadastros/fornecedor" },
  { label: "Cargos / Funções", to: "/cadastros/cargo" },
  { label: "Setores / Centros de custo", to: "/cadastros/setor" },
  { label: "Usuários", to: "/cadastros/usuario" },
  { label: "Locais de estoque", to: "/cadastros/local-estoque" },
  { label: "Categorias de EPI", to: "/cadastros/categoria-epi" },
  { label: "Motivos de movimentação", to: "/cadastros/motivo-movimentacao" },
  { label: "Cadastrar biometria", to: "/cadastros/biometria" },
  { label: "Matriz EPI x Função", to: "/epis-cas" },
];

export default function CadastrosCentral() {
  return (
    <AppShell title="Cadastros" subtitle="Cadastro e manutenção de dados mestres." activeSection="Cadastros">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10">
        <h2 className="text-xl font-semibold text-epi-ink">Cadastros</h2>
        <p className="mt-1 text-sm text-epi-muted">Centralize os principais registros utilizados pelo sistema.</p>

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
