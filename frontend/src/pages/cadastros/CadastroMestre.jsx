import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../../layouts/AppShell.jsx";
import MasterForm from "../../components/MasterForm.jsx";
import { CADASTROS_CONFIG, CADASTROS_ORDER } from "../../data/cadastrosConfig.js";

export default function CadastroMestre() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const config = CADASTROS_CONFIG[tipo];

  if (!config) {
    return (
      <AppShell title="Cadastro não encontrado" subtitle="Cadastro e manutenção de dados mestres." activeSection="Cadastros">
        <p className="text-sm text-epi-muted">
          Este cadastro ainda não existe. Escolha um dos disponíveis: {CADASTROS_ORDER.join(", ")}.
        </p>
      </AppShell>
    );
  }

  function goToNext() {
    const currentIndex = CADASTROS_ORDER.indexOf(tipo);
    const next = CADASTROS_ORDER[(currentIndex + 1) % CADASTROS_ORDER.length];
    navigate(`/cadastros/${next}`);
  }

  return (
    <AppShell title={config.pageTitle} subtitle={config.pageSubtitle} activeSection={config.navLabel}>
      <MasterForm
        key={tipo}
        title={config.title}
        subtitle={config.subtitle}
        fields={config.fields}
        onCancel={() => navigate(-1)}
        onSaveAndNext={goToNext}
        // TODO: persistir no backend quando a Sprint 4 definir a API de cadastros mestres.
      />
    </AppShell>
  );
}
