import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import CadastrosCentral from "./pages/cadastros/CadastrosCentral.jsx";
import CadastroMestre from "./pages/cadastros/CadastroMestre.jsx";
import BiometriaCadastro from "./pages/cadastros/BiometriaCadastro.jsx";
import ObrasLista from "./pages/obras/ObrasLista.jsx";
import ObraDetalhe from "./pages/obras/ObraDetalhe.jsx";
import FuncionariosLista from "./pages/funcionarios/FuncionariosLista.jsx";
import NovoFuncionario from "./pages/funcionarios/NovoFuncionario.jsx";
import FuncionarioEmConstrucao from "./pages/funcionarios/FuncionarioEmConstrucao.jsx";
import Placeholder from "./pages/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastros" element={<CadastrosCentral />} />
        <Route path="/cadastros/biometria" element={<BiometriaCadastro />} />
        <Route path="/cadastros/:tipo" element={<CadastroMestre />} />
        <Route path="/obras" element={<ObrasLista />} />
        <Route path="/obras/:slug" element={<ObraDetalhe />} />
        <Route path="/funcionarios" element={<FuncionariosLista />} />
        <Route path="/funcionarios/novo" element={<NovoFuncionario />} />
        <Route path="/funcionarios/:matricula" element={<FuncionarioEmConstrucao title="Ficha do funcionário" />} />
        <Route path="/visao-geral" element={<Placeholder />} />
        <Route path="/entregas" element={<Placeholder />} />
        <Route path="/estoque" element={<Placeholder />} />
        <Route path="/epis-cas" element={<Placeholder />} />
        <Route path="/relatorios" element={<Placeholder />} />
        <Route path="/configuracoes" element={<Placeholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
