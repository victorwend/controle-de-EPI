import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import CadastroMestre from "./pages/cadastros/CadastroMestre.jsx";
import Placeholder from "./pages/Placeholder.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastros/:tipo" element={<CadastroMestre />} />
        <Route path="/visao-geral" element={<Placeholder />} />
        <Route path="/entregas" element={<Placeholder />} />
        <Route path="/funcionarios" element={<Placeholder />} />
        <Route path="/estoque" element={<Placeholder />} />
        <Route path="/epis-cas" element={<Placeholder />} />
        <Route path="/obras" element={<Placeholder />} />
        <Route path="/relatorios" element={<Placeholder />} />
        <Route path="/configuracoes" element={<Placeholder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
