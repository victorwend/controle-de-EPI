import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import CadastrosCentral from "./pages/cadastros/CadastrosCentral.jsx";
import CadastroMestre from "./pages/cadastros/CadastroMestre.jsx";
import BiometriaCadastro from "./pages/cadastros/BiometriaCadastro.jsx";
import ObrasLista from "./pages/obras/ObrasLista.jsx";
import ObraDetalhe from "./pages/obras/ObraDetalhe.jsx";
import NovaObra from "./pages/obras/NovaObra.jsx";
import FuncionariosLista from "./pages/funcionarios/FuncionariosLista.jsx";
import NovoFuncionario from "./pages/funcionarios/NovoFuncionario.jsx";
import FichaFuncionario from "./pages/funcionarios/FichaFuncionario.jsx";
import HistoricoCompleto from "./pages/funcionarios/HistoricoCompleto.jsx";
import EpisLista from "./pages/epis/EpisLista.jsx";
import NovoEpi from "./pages/epis/NovoEpi.jsx";
import MatrizEpiFuncao from "./pages/epis/MatrizEpiFuncao.jsx";
import EstoquePorLocal from "./pages/estoque/EstoquePorLocal.jsx";
import EntradaEstoque from "./pages/estoque/EntradaEstoque.jsx";
import MovimentacoesEstoque from "./pages/estoque/MovimentacoesEstoque.jsx";
import TransferenciaEstoque from "./pages/estoque/TransferenciaEstoque.jsx";
import EntregasLista from "./pages/entregas/EntregasLista.jsx";
import NovaEntrega from "./pages/entregas/NovaEntrega.jsx";
import TrocaDevolucao from "./pages/entregas/TrocaDevolucao.jsx";
import LoteEntrega from "./pages/entregas/LoteEntrega.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import RelatoriosPainel from "./pages/relatorios/RelatoriosPainel.jsx";
import FichaEpiIndividual from "./pages/relatorios/FichaEpiIndividual.jsx";
import Placeholder from "./pages/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route element={<RequireAuth />}>
            <Route path="/obras/nova" element={<NovaObra />} />
            <Route path="/cadastros" element={<CadastrosCentral />} />
            <Route path="/cadastros/biometria" element={<BiometriaCadastro />} />
            <Route path="/cadastros/:tipo" element={<CadastroMestre />} />
            <Route path="/obras" element={<ObrasLista />} />
            <Route path="/obras/:slug" element={<ObraDetalhe />} />
            <Route path="/funcionarios" element={<FuncionariosLista />} />
            <Route path="/funcionarios/novo" element={<NovoFuncionario />} />
            <Route path="/funcionarios/:matricula" element={<FichaFuncionario />} />
            <Route path="/funcionarios/:matricula/historico" element={<HistoricoCompleto />} />
            <Route path="/funcionarios/:matricula/ficha-epi" element={<FichaEpiIndividual />} />
            <Route path="/epis-cas" element={<EpisLista />} />
            <Route path="/epis-cas/novo" element={<NovoEpi />} />
            <Route path="/epis-cas/matriz" element={<MatrizEpiFuncao />} />
            <Route path="/visao-geral" element={<Dashboard />} />
            <Route path="/entregas" element={<EntregasLista />} />
            <Route path="/entregas/nova" element={<NovaEntrega />} />
            <Route path="/entregas/troca-devolucao" element={<TrocaDevolucao />} />
            <Route path="/entregas/lote" element={<LoteEntrega />} />
            <Route path="/estoque" element={<EstoquePorLocal />} />
            <Route path="/estoque/entrada" element={<EntradaEstoque />} />
            <Route path="/estoque/movimentacoes" element={<MovimentacoesEstoque />} />
            <Route path="/estoque/transferencia" element={<TransferenciaEstoque />} />
            <Route path="/relatorios" element={<RelatoriosPainel />} />
            <Route path="/configuracoes" element={<Placeholder />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
