// Edge Function: convida um novo usuário para a empresa de quem chama.
//
// Por que isso não pode ser feito só com a chave anon no navegador: criar
// conta de auth para OUTRA pessoa (auth.admin.inviteUserByEmail) exige a
// service_role key, que nunca pode ficar exposta no cliente. Esta função
// roda no servidor do Supabase, usa a service_role só aqui dentro, e antes
// de fazer qualquer coisa confirma que quem chamou é Administrador da
// própria empresa (não deixa qualquer usuário autenticado convidar gente).
//
// Deploy: supabase functions deploy convidar-usuario
// (SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já existem
// como variáveis de ambiente automáticas de toda Edge Function.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const PERFIS_VALIDOS = ["administrador", "almoxarife", "tecnico_seguranca", "gestor", "operador"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autenticado." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerUsuario, error: callerUsuarioError } = await adminClient
      .from("usuarios")
      .select("empresa_id, perfil")
      .eq("id", caller.id)
      .single();

    if (callerUsuarioError || !callerUsuario) {
      return jsonResponse({ error: "Usuário não encontrado." }, 403);
    }

    if (callerUsuario.perfil !== "administrador") {
      return jsonResponse({ error: "Só o Administrador pode convidar novos usuários." }, 403);
    }

    const { nome, email, perfil, obraIds, redirectTo } = await req.json();

    if (!nome?.trim() || !email?.trim() || !perfil) {
      return jsonResponse({ error: "Preencha nome, e-mail e perfil." }, 400);
    }

    if (!PERFIS_VALIDOS.includes(perfil)) {
      return jsonResponse({ error: "Perfil inválido." }, 400);
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim(),
      redirectTo ? { redirectTo } : undefined
    );

    if (inviteError || !inviteData?.user) {
      return jsonResponse({ error: inviteError?.message || "Não foi possível enviar o convite." }, 400);
    }

    const novoUsuarioId = inviteData.user.id;

    const { error: usuarioError } = await adminClient.from("usuarios").insert({
      id: novoUsuarioId,
      empresa_id: callerUsuario.empresa_id,
      nome_completo: nome.trim(),
      email: email.trim(),
      perfil,
    });

    if (usuarioError) {
      // Convite de auth já foi enviado; sem o registro em "usuarios" a pessoa
      // consegue logar mas fica sem empresa/perfil. Melhor apagar o usuário
      // de auth criado e devolver o erro, do que deixar esse estado quebrado.
      await adminClient.auth.admin.deleteUser(novoUsuarioId);
      return jsonResponse({ error: usuarioError.message }, 400);
    }

    if (Array.isArray(obraIds) && obraIds.length > 0) {
      const linhas = obraIds.map((obraId: string) => ({ usuario_id: novoUsuarioId, obra_id: obraId }));
      await adminClient.from("usuario_obras").insert(linhas);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
