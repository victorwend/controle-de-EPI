import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";

// Destinos extraídos do Dev Mode do Figma (cada bloco navega direto para o
// formulário de criação daquele cadastro, não para uma lista). Onde o
// cadastro real ainda não existe, aponta para o placeholder do módulo.
//
// EPI-323 (31/10/2026): Funcionários, EPIs e CAs e Obras saíram daqui de
// propósito. Eles já têm menu próprio, com lista, botão de novo e (no caso
// de Funcionários) importação por planilha. Esta tela fica só com as
// tabelas de apoio, para cada cadastro ter um caminho só.
// Isso diverge do protótipo 09.01 do Figma, que precisa ser atualizado.
const TILES = [
  { label: "Fornecedores", to: "/cadastros/fornecedor" },
  { label: "Cargos / Funções", to: "/cadastros/cargo" },
  { label: "Setores / Centros de custo", to: "/cadastros/setor" },
  { label: "Usuários", to: "/cadastros/usuario" },
  { label: "Locais de estoque", to: "/estoque/locais/novo" },
  { label: "Categorias de EPI", to: "/cadastros/categoria-epi" },
  { label: "Motivos de movimentação", to: "/cadastros/motivo-movimentacao" },
  { label: "Cadastrar biometria", to: "/cadastros/biometria" },
  { label: "Matriz EPI x Função", to: "/epis-cas/matriz" },
];

export default function CadastrosCentral() {
  return (
    <AppShell title="Cadastros" subtitle="Cadastro e manutenção de dados mestres." activeSection="Cadastros">
      <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10">
        <h2 className="text-xl font-semibold text-epi-ink">Cadastros</h2>
        <p className="mt-1 text-sm text-epi-muted">
          Tabelas de apoio usadas pelo sistema. Funcionários, EPIs e CAs e Obras são cadastrados nos seus
          próprios menus.
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
