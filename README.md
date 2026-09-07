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

- **07/09/2026 — Sprint 6 completa: EPIs, CAs e Matriz (06.01/06.02/06.03).** Lista de EPIs com busca e filtro por validade (mesmo dataset mock de 5 EPIs do Figma); Novo EPI com o painel "Pontos para validar" reproduzido tal como está no protótipo (perguntas em aberto, não funcionalidade); Matriz EPI x Função com badges coloridos (Obrigatório/Recomendado) trocando por função selecionada. Decisão consciente: só a função "Servente" tem matriz desenhada no Figma — as demais mostram "Nenhuma matriz definida para esta função ainda" em vez de dados inventados. Ficha (04.03), Histórico completo (04.04) e Transferência de obra (04.05) ficaram propositalmente pendentes da Sprint 5, adiadas para quando a Sprint 8 (Entregas) já tiver dado real de entregas para mostrar — conforme o próprio plano de produção recomendava.
- **07/09/2026 — Novo funcionário (04.02) + fluxo unificado de biometria (09.10–09.13).** Resolve a decisão de arquitetura pendente (risco 3 do plano de produção): um único componente `frontend/src/pages/cadastros/BiometriaCadastro.jsx` com passos internos (busca → captura → confirmar → sucesso) atende os dois pontos de entrada do Figma — a busca dedicada a partir do hub de Cadastros e o atalho embutido em "Novo funcionário", que já chega com o funcionário conhecido (passado via router state) e pula direto para a captura. Os textos de retorno no passo final mudam conforme a origem ("Voltar aos cadastros" vs. "Voltar ao cadastro do funcionário"). Testado ponta a ponta nos dois caminhos no navegador. `frontend/src/pages/funcionarios/NovoFuncionario.jsx` reproduz o painel lateral "Validação necessária" do Figma tal como está — é uma lista de perguntas em aberto do próprio protótipo, não uma funcionalidade.
- **07/09/2026 — Lista de Funcionários (04.01) — início da Sprint 5.** Tabela com busca (nome/matrícula/função) e filtro por obra funcionando de verdade sobre um dataset mock (`frontend/src/data/funcionariosConfig.js`, 5 funcionários — mesmos dados do Figma), já que ainda não existe backend. Clique no nome ou "+ Novo funcionário" navegam para rotas reais (`/funcionarios/:matricula`, `/funcionarios/novo`) que por enquanto mostram um aviso honesto — essas duas telas (04.02 e 04.03) dependem da decisão de arquitetura da biometria (risco 3 do plano de produção) antes de serem construídas, para não implementar cadastro biométrico duas vezes.
- **07/09/2026 — Central de Cadastros (09.01) — Sprint 4 completa.** Hub de navegação em `frontend/src/pages/cadastros/CadastrosCentral.jsx`, nova rota `/cadastros` (a rota dinâmica `/cadastros/:tipo` continua existindo para os formulários). O menu lateral "Cadastros" agora aponta para o hub em vez de ir direto pro primeiro formulário. Confirmado no Dev Mode do Figma que cada bloco navega direto para o formulário de criação daquele cadastro (não para uma lista) — os 6 já construídos apontam pros formulários reais; os que ainda não existem (Funcionários, EPIs e CAs, Usuários, Cadastrar biometria, Matriz EPI x Função) apontam pro placeholder do módulo ou caem na mensagem "cadastro não encontrado" da rota dinâmica, nunca em link morto. Uma correção consciente: os botões "Cancelar/Próximo cadastro/Salvar cadastro" que o Figma reaproveitou do template de formulário nessa tela foram removidos — não fazem sentido numa tela puramente de navegação, sem nada sendo editado. Com isso fecha a Sprint 4 (Cadastros e obras): 8 telas de cadastro + 2 de Obras + o hub, todas testadas manualmente no navegador contra o protótipo.
- **07/09/2026 — Obras: lista e detalhe (07.01/07.02).** Diferente dos cadastros mestres, essas duas telas têm layout próprio (cards + página de detalhe), não reaproveitam o `MasterForm` — novo `frontend/src/data/obrasConfig.js` + `frontend/src/pages/obras/`. Duas correções conscientes em relação ao protótipo literal: (1) no Figma as 4 telas de detalhe repetem o link "Ver funcionários →" nos 4 cards por engano de copiar-colar; aqui cada card tem o link contextual certo (Ver funcionários/Ver estoque/Ver pendências/Ver responsáveis). (2) o Figma destaca "Visão geral" no menu lateral mesmo estando na tela de Obras (mesmo tipo de descuido); aqui o destaque segue a seção real. O Figma só desenhou o detalhe operacional completo pra uma obra (BR-040); as outras 3 (Usina, Britagem, Almoxarifado Central) mostram um aviso honesto de que aquele detalhamento ainda não foi desenhado, em vez de inventar números. Botão "+ Nova obra" já navega para o cadastro de obra (09.02) que tínhamos acabado de construir — reaproveitamento real, não maquete.
- **06/09/2026 — Cadastro de obra (09.02).** Sétimo cadastro mestre, mesma mecânica: só entrada em `cadastrosConfig.js`, sem código novo. Único detalhe de conteúdo: o campo Status usa "Ativa/Inativa" (concordância com "obra"), diferente do "Ativo/Inativo" dos demais cadastros — mantido fiel ao texto do Figma em vez de padronizar à força. O campo "Responsável" de Local de estoque e Obra segue sem opções reais (dependem de Funcionários, ainda não construído).
- **06/09/2026 — Cadastro de local de estoque (09.07).** Sexto cadastro mestre, seguindo a ordem do plano de produção (depois dos 5 sem dependência, antes de Obra). Reaproveita o `MasterForm` genérico sem nenhum código novo além da entrada em `cadastrosConfig.js` — só adicionar ao objeto de configuração e à lista `CADASTROS_ORDER` foi suficiente. Campos "Obra" e "Responsável" ficam sem opções reais até `09.02 — Obra` existir.
- **06/09/2026 — Cadastros mestres simples (5 telas) + shell do app.** Construído `frontend/src/layouts/AppShell.jsx` (menu lateral + cabeçalho, cores extraídas do frame `09.05 — Cadastros — Setor` em Dev Mode: sidebar `#093826`, item ativo `#17523B`) e `frontend/src/components/MasterForm.jsx` — o componente parametrizado único recomendado pelo plano de produção, em vez de telas independentes. Cinco cadastros mestres usam esse componente com os campos exatos observados no Figma (`frontend/src/data/cadastrosConfig.js`): Setor/centro de custo (09.05), Cargo/função (09.04), Fornecedor (09.03), Categoria de EPI (09.08) e Motivo de movimentação (09.09). Roteamento adicionado (`react-router-dom`); "Entrar" no Login agora navega de verdade para `/visao-geral`, e os demais itens do menu lateral levam a uma tela "ainda não construída" honesta em vez de link morto ou 404. Selects de campos que dependem de cadastros futuros (Obra, Responsável, Setor em Cargo) ficam sem opções reais por enquanto. Bug encontrado e corrigido durante o teste manual: o formulário não resetava os campos ao navegar entre cadastros pelo botão "Próximo cadastro" (React reaproveitava a mesma instância do componente) — corrigido com `key={tipo}` em `CadastroMestre.jsx`.
- **06/09/2026 — Primeira tela implementada: Login (01.01).** Scaffold do front-end criado em `frontend/` (React + Vite + Tailwind, sem TypeScript e sem dependências além do essencial, seguindo o princípio de dependência mínima do hub). A tela reproduz o protótipo do Figma com os valores exatos extraídos via Dev Mode (cores em hex, tipografia Inter, espaçamento e raios) — ver `frontend/src/pages/Login.jsx` e os tokens em `frontend/tailwind.config.js`. O formulário é funcional (inputs controlados) mas o envio ainda não está integrado a nenhum backend — isso fica para a Sprint 3 (Autenticação e segurança), quando a arquitetura de auth for decidida. O link "Esqueci minha senha" foi mantido como visual não funcional, refletindo a lacuna já registrada em `docs/05-arquitetura/plano-de-producao-telas.md` (risco 2: não existe tela de recuperação de senha no protótipo).
- **06/09/2026 — Inspeção visual das 63 telas e plano de produção.** A auditoria anterior do Figma era estrutural (contagem de telas/reações via API); esta sessão abriu cada uma das 63 telas para ler conteúdo real (campos, textos, botões) e documentar correlação de fluxo entre elas. Resultado em `docs/05-arquitetura/plano-de-producao-telas.md`: inventário tela a tela, decisão de arquivar a tela duplicada `15 — Devolução ou troca de EPI` em favor de `03.08 — Entregas — Troca e devolução` (mais completa e já integrada à navegação), identificação de que os módulos 10 (Configurações) e 11 (Estados) e o sub-fluxo de biometria em Entregas são componentes reutilizáveis parametrizados — não telas separadas —, e ordem de construção tela a tela dentro de cada sprint já existente em `gestao/sprints/`.

## Como colaborar

O projeto também poderá ser usado por estudantes iniciantes para praticar um fluxo profissional de trabalho. Cada melhoria deverá ser registrada como uma tarefa antes do desenvolvimento.

Conhecimento prévio de programação não é obrigatório para participar das etapas de levantamento, documentação, prototipação e testes.
