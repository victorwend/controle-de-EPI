# Sistema de Controle de EPIs

Projeto acadêmico e prático para desenvolver um sistema de controle de Equipamentos de Proteção Individual (EPIs).

O front-end começou a ser construído em 06/09/2026 (tela de Login). O restante do sistema ainda não tem código.

## Stack

- **Front-end:** React + Vite + Tailwind CSS (mesma convenção dos demais projetos do hub). Ver `frontend/`.
- **Back-end:** a definir (Sprint 2 — Arquitetura e dados).

## Objetivo

Organizar o desenvolvimento de um sistema capaz de apoiar, futuramente:

- cadastro de funcionários, obras e EPIs;
- controle de entrada, saída e saldo de estoque;
- registro de entrega, devolução e troca de EPIs;
- controle de CA e validade;
- transferência de funcionários e materiais entre obras;
- geração de históricos e relatórios;
- confirmação de recebimento por assinatura ou biometria.

## Organização do repositório

| Pasta | Finalidade |
|---|---|
| `docs/01-visao-geral` | Objetivos, escopo e visão do produto |
| `docs/02-requisitos` | Requisitos funcionais, não funcionais e regras de negócio |
| `docs/03-processos` | Fluxos de trabalho e processos da empresa |
| `docs/04-ux-ui` | Protótipos, telas, pesquisas e decisões de usabilidade |
| `docs/05-arquitetura` | Decisões técnicas e diagramas da solução |
| `docs/06-banco-de-dados` | Modelos conceitual, lógico e físico |
| `docs/07-testes` | Planos, cenários e resultados de testes |
| `docs/08-seguranca` | Permissões, riscos e cuidados com os dados |
| `docs/09-reunioes` | Atas, decisões e acompanhamentos |
| `docs/10-aprendizado` | Anotações da faculdade aplicadas ao projeto |
| `gestao/backlog` | Ideias e tarefas que ainda serão priorizadas |
| `gestao/sprints` | Planejamento e acompanhamento dos ciclos de trabalho |
| `gestao/modelos` | Modelos reutilizáveis de tarefa, reunião e documentação |
| `assets` | Imagens, diagramas e materiais visuais |
| `backend` | Espaço reservado para o código do servidor |
| `frontend` | Interface do sistema (React + Vite + Tailwind) |
| `tests` | Espaço reservado para os testes automatizados |

## Situação atual

- [x] Repositório criado
- [x] Estrutura de pastas organizada
- [ ] Documentar a visão do produto
- [ ] Levantar requisitos
- [ ] Definir regras de negócio
- [ ] Modelar o banco de dados
- [ ] Definir a arquitetura
- [x] Iniciar o desenvolvimento (front-end, tela de Login)

## Changelog

- **06/09/2026 — Primeira tela implementada: Login (01.01).** Scaffold do front-end criado em `frontend/` (React + Vite + Tailwind, sem TypeScript e sem dependências além do essencial, seguindo o princípio de dependência mínima do hub). A tela reproduz o protótipo do Figma com os valores exatos extraídos via Dev Mode (cores em hex, tipografia Inter, espaçamento e raios) — ver `frontend/src/pages/Login.jsx` e os tokens em `frontend/tailwind.config.js`. O formulário é funcional (inputs controlados) mas o envio ainda não está integrado a nenhum backend — isso fica para a Sprint 3 (Autenticação e segurança), quando a arquitetura de auth for decidida. O link "Esqueci minha senha" foi mantido como visual não funcional, refletindo a lacuna já registrada em `docs/05-arquitetura/plano-de-producao-telas.md` (risco 2: não existe tela de recuperação de senha no protótipo).
- **06/09/2026 — Inspeção visual das 63 telas e plano de produção.** A auditoria anterior do Figma era estrutural (contagem de telas/reações via API); esta sessão abriu cada uma das 63 telas para ler conteúdo real (campos, textos, botões) e documentar correlação de fluxo entre elas. Resultado em `docs/05-arquitetura/plano-de-producao-telas.md`: inventário tela a tela, decisão de arquivar a tela duplicada `15 — Devolução ou troca de EPI` em favor de `03.08 — Entregas — Troca e devolução` (mais completa e já integrada à navegação), identificação de que os módulos 10 (Configurações) e 11 (Estados) e o sub-fluxo de biometria em Entregas são componentes reutilizáveis parametrizados — não telas separadas —, e ordem de construção tela a tela dentro de cada sprint já existente em `gestao/sprints/`.

## Como colaborar

O projeto também poderá ser usado por estudantes iniciantes para praticar um fluxo profissional de trabalho. Cada melhoria deverá ser registrada como uma tarefa antes do desenvolvimento.

Conhecimento prévio de programação não é obrigatório para participar das etapas de levantamento, documentação, prototipação e testes.
