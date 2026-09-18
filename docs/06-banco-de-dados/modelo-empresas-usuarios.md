# Modelo de dados — Empresas, usuários e obras (base multi-tenant)

Primeira fatia do modelo lógico do Sprint 2 — cobre só o necessário para o fluxo de autenticação/onboarding decidido em 2026-09-17 (ver changelog do README). As demais entidades da lista "mínima esperada" do Sprint 2 (funcionário, EPI, CA, estoque, movimentação, entrega...) entram em arquivos SQL numerados seguintes, conforme cada sprint for tocando o banco — este documento não tenta cobrir todas de uma vez.

SQL: [`supabase/01_empresas_e_usuarios.sql`](../../supabase/01_empresas_e_usuarios.sql).

## Por que multi-tenant

O produto vai ser vendido para várias empresas, não só para a Pavidez (cliente original do protótipo Figma). Cada empresa precisa se autocadastrar sem depender de alguém criar a conta manualmente — ver decisão completa no changelog do README (2026-09-17).

## Entidades

- **`empresas`** — o tenant. `razao_social`, `cnpj` (único). Tudo no sistema pertence a uma empresa.
- **`obras`** — versão mínima (`nome`, `status`), só para sustentar "obras permitidas" do usuário. O cadastro completo (tela 09.02) chega no Sprint 4 e só adiciona colunas, sem quebrar isto.
- **`usuarios`** — perfil de acesso 1:1 com `auth.users` (mesmo `id` do Supabase Auth, de propósito, para não duplicar identidade). Campo `perfil` é o enum `perfil_usuario`: `administrador`, `almoxarife`, `tecnico_seguranca`, `gestor`, `operador` (default) — catálogo extraído da tela Figma `10.03 — Configurações — Usuários e permissões`.
- **`usuario_obras`** — tabela de junção N:N, o escopo por obra dentro da empresa (RN011).

## RLS

Toda tabela filtra por `empresa_id = empresa_atual()`, onde `empresa_atual()`/`perfil_atual()` são funções `security definer` que leem a linha de `usuarios` do usuário logado (evita recursão de RLS sobre a própria tabela). Só `perfil = 'administrador'` pode inserir/alterar/apagar usuários, obras e vínculos de obra da própria empresa — o resto só enxerga (RN010, RN012).

## Fluxo de criação

1. **Empresa nova (autocadastro):** front chama `supabase.auth.signUp()` (cria a conta) e, autenticado, chama a RPC `criar_empresa_com_administrador(razao_social, cnpj, nome_responsavel)` — cria a empresa e já grava esse usuário como `administrador` dela. Bloqueada se o usuário já pertencer a uma empresa.
2. **Colaborador novo (convite):** feito pelo Administrador via tela 09.06 — fora do escopo deste arquivo, depende de uma Edge Function com `service_role` (não implementada ainda) porque convidar terceiro exige privilégio que a chave `anon` não deve ter.

## Pendências conscientes desta fatia

- Sem tela de recuperação de senha ainda (gap já registrado no plano de produção de telas, risco 2).
- `usuarios.status` (`ativo`/`inativo`) existe na tabela mas ainda não é aplicado em nenhuma policy — um usuário `inativo` hoje continua acessando normalmente. Bloqueio por status fica para quando o login estiver de fato ligado ao Supabase Auth.
