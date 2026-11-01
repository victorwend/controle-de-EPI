import { createClient } from '@supabase/supabase-js'
import { criarArmazenamentoSessao } from './lembrarLogin.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env (ver .env.example).')
}

// EPI-341: a sessão fica guardada no navegador (e é renovada sozinha) para
// a pessoa não precisar digitar a senha a cada acesso. Com "Manter
// conectado" desmarcado no login, ela some ao fechar o navegador.
// A senha nunca é guardada pelo sistema.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: criarArmazenamentoSessao(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
