import { useAuth } from "../context/AuthContext.jsx";

// Mostra o conteúdo só se o perfil do usuário tiver a permissão (EPI-337).
// Uso: <SePuder acao="registrar_entregas"><Link ...>+ Nova entrega</Link></SePuder>
//
// É só para a tela ficar limpa: quem BARRA a ação é o banco (correção 19).
export default function SePuder({ acao, children }) {
  const { pode } = useAuth();
  return pode(acao) ? children : null;
}
