# Plano de produção das telas — Sistema de Controle de EPIs

Data da inspeção: 06/09/2026
Base: primeira inspeção visual de conteúdo real das 63 telas do [protótipo no Figma](https://www.figma.com/design/OCaFMqFyl4bmSAvZaK4Y0D), tela por tela (a auditoria anterior em `docs/04-ux-ui/auditoria-figma.md` era estrutural — contagem de telas e reações — sem abrir o conteúdo de cada uma).

Este documento não substitui `docs/02-requisitos/regras-de-negocio.md` nem `gestao/sprints/`; ele conecta os dois ao conteúdo real das telas, na granularidade de tela dentro de cada sprint já definida.

## 1. Achado estrutural mais importante: nem toda "tela" é uma tela

A inspeção mostrou três grupos de frames que **não devem virar rotas/páginas separadas** — são estados ou abas de um mesmo componente. Isso muda a estimativa de esforço de produção (menos telas reais do que os 63 frames sugerem) e deve orientar a arquitetura de componentes:

- **Módulo 10 — Configurações (10.02 a 10.10, 9 frames):** todos compartilham o mesmo layout (menu lateral interno com 9 itens + painel de conteúdo à direita + Anterior/Próximo/Salvar). É **uma única tela** (`10.01 — Central`) com navegação por abas internas, não 9 páginas. Produzir como um componente de configurações com conteúdo trocável por aba.
- **Módulo 11 — Estados (11.01 a 11.07, 7 frames):** mesmo componente de modal (ícone + título + descrição + botão), variando só o texto. `11.01` (confirmar exclusão) e `11.02` (erro) têm ação dupla (Cancelar/Confirmar); `11.03` a `11.07` são todas a mesma variação de sucesso (ícone de check + "Fechar"). Produzir como **dois componentes genéricos** (`ConfirmModal`, `SuccessModal`) parametrizados por texto, não 7 telas fixas.
- **Confirmação biométrica em Entregas (03.05, 03.09, 03.10, 03.11, 03.12, 5 frames):** são o **mesmo modal de leitura biométrica** disparado pelo botão "Confirmar com biometria" em `03.04`, variando pelo status da leitura: `03.05` aguardando leitura, `03.09` funcionário sem biometria cadastrada, `03.10` leitor desconectado, `03.11` leitura não reconhecida, `03.12` confirmada. Produzir como **um componente com 5 estados**, não 5 telas.

Resultado prático: das 63 telas do Figma, o inventário funcional real é de **~44 telas/páginas distintas** mais **3 componentes de estado reutilizáveis** (configurações por aba, modal genérico de confirmação/erro, modal de biometria).

## 2. Inventário das 63 telas (conteúdo observado)

### Autenticação
- **01.01 — Login:** formulário e-mail/senha, branding "PAVIDEZ — Controle de EPI", claim "Segurança • Rastreabilidade • Conformidade". Sem fluxo de "esqueci minha senha" implementado (só o link, sem tela de destino).

### Dashboard
- **02.01 — Dashboard:** 4 KPIs (EPIs em estoque, entregas no mês, estoque crítico, CAs a vencer), tabela de movimentações recentes, painel de alertas/pendências, 4 ações rápidas (Registrar entrega, Cadastrar funcionário, Entrada de estoque, Gerar relatório).

### Entregas de EPI
- **03.01 — Lista:** busca, filtro por obra/período, tabela com status (Confirmada/Pendente), atalhos para Troca/devolução e Entrega em lote.
- **03.02 — Nova entrega — Funcionário:** wizard passo 1/3, busca funcionário, mostra obra/função atuais e resumo do colaborador.
- **03.03 — Nova entrega — Selecionar EPI:** wizard passo 2/3, adicionar itens com saldo em tempo real, alerta quando item fica abaixo do mínimo após a entrega.
- **03.04 — Confirmação da entrega:** wizard passo 3/3, resumo + impacto no estoque (saldo antes → depois) + aceite (já registrado ou botão "Confirmar com biometria").
- **03.05 — Confirmação por biometria:** estado "aguardando leitura" do modal biométrico.
- **03.06 — Concluída:** sucesso, número de comprovante, atalhos (Ver entregas / Nova entrega / Abrir ficha).
- **03.07 — Em lote:** seleção de múltiplos funcionários + EPIs sugeridos pela matriz da função, cálculo do total antes de confirmar.
- **03.08 — Troca e devolução:** contexto do funcionário fixo, tabela real dos EPIs em posse com ação individual (Trocar/Devolver) e destino (Estoque/Descarte) por item, resumo de itens selecionados.
- **03.09 — Biometria não cadastrada:** estado de erro do modal biométrico, com CTA "Cadastrar biometria".
- **03.10 — Leitor biométrico desconectado:** estado de erro do modal biométrico.
- **03.11 — Biometria não reconhecida:** estado de erro do modal biométrico, com "Tentar novamente".
- **03.12 — Biometria confirmada:** estado de sucesso do modal biométrico, libera "Concluir entrega".

### Funcionários
- **04.01 — Lista:** tabela com matrícula, função, obra, EPIs ativos, pendências, status.
- **04.02 — Novo funcionário:** dados cadastrais + bloco de biometria embutido no mesmo formulário (cadastrar depois ou agora).
- **04.03 — Ficha:** resumo do funcionário + histórico de entregas + ficha de EPI (aceite/alertas) + atalhos (Transferir, Histórico completo, Registrar entrega).
- **04.04 — Histórico completo:** mesma ficha, mas com filtro por tipo de movimentação (Entregas/Trocas/Devoluções/período).
- **04.05 — Transferência de obra:** obra atual → nova obra + motivo + data efetiva, resumo da transferência e "regras aplicadas" (histórico preservado, EPIs vinculados mantidos).

### Estoque
- **05.02 — Entrada:** EPI, quantidade, local, documento/NF, fornecedor, responsável; painel lateral com saldo antes/depois.
- **05.03 — Transferência:** origem → destino, quantidade, responsáveis dos dois lados, saldo resultante nos dois locais.
- **05.04 — Transferência concluída:** estado de sucesso específico de estoque (diferente dos modais genéricos do módulo 11 — teria de ser unificado, ver seção 5).
- **05.05 — Bloqueio por saldo insuficiente:** tela de bloqueio acionada a partir da entrega quando a quantidade pedida excede o saldo; lista os itens problemáticos com solicitado × disponível.
- **05.06 — Vazio:** estado vazio de estoque por local ("Nenhum EPI encontrado"), com atalho para limpar filtros ou registrar entrada.
- **05.07 — Movimentações:** log consolidado (entradas, saídas, ajustes, transferências) com busca e filtro por tipo.
- **Confirmado:** não existe `05.01 — Visão geral` (mesma lacuna já registrada na auditoria anterior — o módulo Estoque não tem uma tela de entrada/painel antes de ir direto para Entrada ou Movimentações).

### EPIs e CAs
- **06.01 — Lista:** EPI, categoria, CA, fabricante, validade do CA, periodicidade, status (Válido/A vencer).
- **06.02 — Novo EPI:** nome, categoria, CA (obrigatório), fabricante, validade, periodicidade de troca, estoque mínimo.
- **06.03 — Matriz EPI x Função:** por função, lista de EPIs com obrigatoriedade (Obrigatório/Recomendado), periodicidade e quantidade.

### Obras
- **07.01 — Lista:** cards por obra com funcionários ativos, EPIs em estoque, pendências.
- **07.02 — Detalhes da obra:** dados da obra, estoque da obra, conformidade, responsáveis, ações (consultar funcionários, transferir estoque, gerar ficha).

### Relatórios
- **08.01 — Painel:** filtro por período/obra, KPIs, consumo por EPI, entregas por obra, lista de relatórios disponíveis para exportação.
- **08.02 — Ficha individual de EPI:** documento de impressão/PDF por funcionário (EPIs entregues, termo de responsabilidade, declaração do colaborador).

### Cadastros (dados mestres)
- **09.01 — Central:** hub com atalho para os 10 cadastros abaixo + biometria + matriz.
- **09.02 — Obra**, **09.03 — Fornecedor**, **09.04 — Cargo**, **09.05 — Setor**, **09.06 — Usuário**, **09.07 — Local de estoque**, **09.08 — Categoria de EPI**, **09.09 — Motivo de movimentação:** todos seguem o mesmo padrão de formulário simples (2 colunas + Cancelar/Próximo cadastro/Salvar). Produzíveis como **um único componente de formulário mestre** parametrizado por schema de campos, não 8 telas independentes.
- **09.10 — Biometria — Buscar funcionário → 09.11 — Captura → 09.12 — Confirmar → 09.13 — Sucesso:** wizard de cadastro biométrico, sequencial e linear (sem ramificações de erro nesta versão — os erros de biometria só existem no fluxo de *entrega*, não no de *cadastro*).

### Configurações
- **10.01 — Central** com abas internas (ver seção 1): **10.02** Empresa e obras, **10.03** Usuários e permissões, **10.04** Regras de entrega, **10.05** Estoque e mínimos, **10.06** Alertas, **10.07** Assinatura e aceite, **10.08** Notificações, **10.09** Integrações, **10.10** Auditoria e segurança. Conteúdo de cada aba já é rico o bastante para virar direto os campos de configuração do backend (ex.: 10.04 já lista literalmente "Bloquear CA vencido / Exigir assinatura / Permitir quantidade acima do padrão / Exigir motivo de substituição" — mapeiam quase 1:1 com RN035, RN056, RN039).

### Estados (modais genéricos)
- **11.01 — Confirmar exclusão**, **11.02 — Erro ao salvar** (ambos com ação dupla), **11.03** Cadastro realizado, **11.04** Entrada registrada, **11.05** Transferência concluída, **11.06** Movimentação registrada, **11.07** Alterações salvas (todos com "Fechar" único) — ver componentização na seção 1.

### Duplicata a resolver
- **15 — Devolução ou troca de EPI** — ver decisão na seção 3.

## 3. Decisão: tela duplicada de troca/devolução

Comparação direta feita nesta sessão (`15` vs `03.08`):

| Critério | `15 — Devolução ou troca de EPI` | `03.08 — Entregas — Troca e devolução` |
|---|---|---|
| Navegação lateral | Nenhum item destacado (órfã da IA atual) | "Entregas de EPI" destacado — integrada ao módulo |
| Seleção do EPI | Campos de texto livres (nome do EPI, CA digitados à mão) | Tabela real dos EPIs **em posse do funcionário**, vinda de dados existentes |
| Quantidade de itens por operação | 1 item por vez | Múltiplos itens na mesma operação, com ação e destino por linha |
| Alinhamento com RN060–RN066 | Parcial (não modela "itens em posse", exigido implicitamente pelas regras de quantidade elegível) | Direto — já é lista de itens elegíveis com ação individual |

**Decisão recomendada: manter `03.08` como versão oficial e arquivar/remover `15`.** `03.08` é estritamente mais completa, já integrada à navegação do módulo Entregas e mais próxima do modelo de dados exigido pelas regras de negócio (RN060 a RN066, seção 8 de `regras-de-negocio.md`). Ação sugerida: mover `15` para uma página de "arquivo"/histórico no Figma (não apagar, para preservar rastro de decisão) e atualizar `docs/04-ux-ui/auditoria-figma.md` marcando o item 4 da lista de lacunas como resolvido.

## 4. Mapa de correlação de fluxo por módulo

```
Login (01.01)
  → Dashboard (02.01) — porta de entrada para todos os módulos

Entregas
  03.01 Lista ──┬─→ 03.02 Funcionário → 03.03 Selecionar EPI → 03.04 Confirmação
                │        → [aceite já registrado] → 03.06 Concluída
                │        → [Confirmar com biometria] → modal biométrico:
                │             03.05 aguardando → 03.12 confirmada → 03.06 Concluída
                │                              → 03.09 sem biometria → (ir cadastrar, ver Cadastros)
                │                              → 03.10 leitor desconectado → tentar de novo
                │                              → 03.11 não reconhecida → tentar de novo
                │        → [saldo insuficiente ao confirmar] → 05.05 Bloqueio
                ├─→ 03.07 Em lote → (mesmo sub-fluxo de aceite/biometria) → comprovantes individuais
                └─→ 03.08 Troca e devolução → 11.06 Movimentação registrada (modal genérico)

Funcionários
  04.01 Lista → 04.03 Ficha ──┬─→ 04.04 Histórico completo
                              ├─→ 04.05 Transferência de obra → 11.05 Transferência concluída
                              └─→ 04.02 Novo funcionário (a partir da Lista, não da Ficha)
                                     → cadastro de biometria embutido ou via 09.10→09.13

Estoque
  05.02 Entrada → 11.04 Entrada registrada
  05.03 Transferência → 05.04 Transferência concluída (duplica o papel do modal 11.05 — ver risco na seção 5)
  05.07 Movimentações ← consulta de todo o histórico acima
  05.06 Vazio ← estado de 05.07/qualquer listagem de estoque sem resultado
  [ausente] 05.01 Visão geral — lacuna já conhecida

EPIs e CAs
  06.01 Lista → 06.02 Novo EPI → 11.03 Cadastro realizado
             → 06.03 Matriz EPI x Função (consumida por 03.03 e 03.07 como sugestão)

Obras
  07.01 Lista → 07.02 Detalhes → ações apontam de volta para Funcionários/Estoque filtrados pela obra

Relatórios
  08.01 Painel → 08.02 Ficha individual de EPI (também acessível a partir de 04.03/04.04)

Cadastros
  09.01 Central → 09.02...09.09 (formulários mestres, todos voltam para 09.01 ou seguem "Próximo cadastro")
               → 09.10 Buscar funcionário → 09.11 Captura → 09.12 Confirmar → 09.13 Sucesso
                 (mesmo destino de 04.02 quando a biometria é cadastrada separadamente)

Configurações
  10.01 Central (abas 10.02–10.10, navegação interna, sem voltar ao Dashboard entre abas)

Estados (modais)
  11.01/11.02 (confirmação dupla) e 11.03–11.07 (sucesso) são acionados a partir de praticamente
  qualquer tela de cadastro/movimentação — não têm "posição" própria no fluxo, são transversais.
```

## 5. Riscos e lacunas encontrados só na inspeção visual (não visíveis na auditoria estrutural anterior)

1. **Modal de sucesso duplicado para Estoque.** `05.04 — Transferência concluída` e `11.05 — Estados — Transferência concluída` têm o mesmo título e função, mas layouts diferentes (05.04 é uma página cheia com atalhos "Voltar ao estoque"/"Nova transferência"; 11.05 é o modal genérico compacto). Antes de programar, decidir qual das duas é a canônica para "transferência de estoque" — usar as duas cria dois componentes fazendo a mesma coisa. Recomendação: usar o modal genérico (11.05) por consistência com o resto do sistema, e tratar 05.04 como versão descartada (similar à decisão da seção 3, mas de menor impacto).
2. **"Esqueci minha senha" sem destino.** `01.01` tem o link, mas não existe tela de recuperação de senha entre as 63 — precisa ser adicionada ao escopo antes da Sprint 3 (Autenticação e segurança) ou explicitamente marcada como "fora do escopo da v1" (ex.: recuperação só via administrador).
3. **Cadastro de biometria tem dois pontos de entrada não unificados.** Pode-se cadastrar biometria dentro de `04.02 — Novo funcionário` (inline) OU via `09.10–09.13` (fluxo dedicado a partir de Cadastros). O protótipo não deixa claro se são o mesmo componente reaproveitado ou duas implementações separadas — precisa virar decisão de arquitetura antes da Sprint 5, não descoberta durante o desenvolvimento.
4. **Erros de biometria só existem no fluxo de entrega, não no de cadastro.** `09.10–09.13` é um caminho feliz sem estados de falha (leitor desconectado, captura falhou, etc.), enquanto o fluxo de entrega (`03.09–03.11`) trata isso bem. Como RN027 exige diferenciar "biometria ausente, não reconhecida e leitor desconectado" de forma geral (não só na entrega), essa cobertura deveria existir também no cadastro — vale levar como pergunta para a validação com SST/RH da Sprint 0.
5. **10.x como "abas" muda a estimativa de esforço da Sprint de Configurações.** Nenhuma sprint documentada em `gestao/sprints/` trata explicitamente de Configurações como módulo — as regras de RN012 (só perfil autorizado altera configurações) e os campos de 10.02–10.10 precisam de um dono de sprint. Sugestão: encaixar como parte da Sprint 3 (Autenticação e segurança) já que a maioria das abas (Usuários e permissões, Auditoria e segurança, Regras de entrega) são regras de acesso/negócio, não puramente UI.
6. **`05.05 — Bloqueio por saldo insuficiente` é chamada a partir de Entregas, não de Estoque**, apesar do prefixo do módulo. Ao planejar a Sprint 7 (Estoque) vs. Sprint 8 (Entrega individual), esta tela específica só pode ser testada de ponta a ponta depois que o fluxo de entrega (Sprint 8) já validar saldo — ou seja, é um critério de aceite cruzado entre as duas sprints, vale registrar explicitamente nos critérios de aceite da Sprint 8.

## 6. Plano de produção — ordem tela a tela dentro de cada sprint

A ordem das sprints (`gestao/sprints/README.md`) não muda. O que segue é a ordem de construção **dentro** de cada sprint, com a dependência técnica que a justifica.

- **Sprint 4 — Cadastros e obras:** construir primeiro os formulários mestres simples e sem dependência (09.05 Setor, 09.04 Cargo, 09.03 Fornecedor, 09.08 Categoria de EPI, 09.09 Motivo de movimentação) usando um único componente parametrizado (seção 1); depois 09.07 Local de estoque (depende de Obra existir) e 09.02 Obra; 07.01/07.02 (Obras) por último porque consomem contagens de funcionários/estoque que só fazem sentido com dados mestres já cadastrados. `09.01 Central` é só um hub de navegação — construir por último, quando os destinos já existirem.
- **Sprint 5 — Funcionários e biometria:** 04.01 Lista e 04.02 Novo funcionário primeiro (dependem só dos cadastros da Sprint 4 — Cargo/Setor/Obra); decidir a arquitetura do risco 3 (biometria unificada) **antes** de construir 04.02 e 09.10–09.13, para não implementar o cadastro biométrico duas vezes; 04.03 Ficha e 04.04 Histórico completo por último (dependem de haver entregas registradas para mostrar algo, o que só existe a partir da Sprint 8); 04.05 Transferência de obra por último (depende de RN020–RN022, e da Ficha já existir).
- **Sprint 6 — EPIs, CAs e matriz:** 06.01 Lista e 06.02 Novo EPI primeiro (sem dependências externas); 06.03 Matriz EPI x Função por último, pois depende de Cargo (Sprint 4) e do cadastro de EPI (06.02) já existirem.
- **Sprint 7 — Estoque:** 05.02 Entrada primeiro (é a única forma de popular saldo, pré-requisito de tudo mais no módulo); 05.07 Movimentações e 05.06 Vazio logo depois (são vistas somente-leitura sobre o que 05.02 gera); 05.03 Transferência por último dentro do módulo (depende de Obras/Locais de estoque da Sprint 4 e de saldo positivo em pelo menos dois locais). Resolver o risco 1 (05.04 vs. 11.05) antes de implementar a tela de sucesso da transferência. `05.05 — Bloqueio por saldo insuficiente` **não** é entregável desta sprint apesar do prefixo — ver risco 6.
- **Sprint 8 — Entrega individual:** ordem imposta pelo próprio wizard: 03.02 → 03.03 → 03.04 primeiro (fluxo feliz sem biometria, aceite simples); só depois implementar o componente de modal biométrico com seus 5 estados (03.05/03.09/03.10/03.11/03.12) reaproveitando o mesmo componente; 03.06 Concluída e 03.01 Lista podem ser construídas em paralelo a qualquer momento (são independentes do wizard); `05.05 — Bloqueio por saldo insuficiente` entra aqui, no fim, como critério de aceite de "estoque insuficiente" (RN055).
- **Sprint 9 — Troca, devolução e lote:** implementar 03.08 diretamente (a decisão da seção 3 já elimina o retrabalho de implementar `15`); 03.07 Em lote depois, pois reaproveita os mesmos componentes de seleção de EPI/aceite do wizard da Sprint 8.
- **Sprint 10 — Histórico, dashboard e relatórios:** 02.01 Dashboard só faz sentido com dados reais de várias sprints anteriores — construir por último entre as telas de leitura, não primeiro; 08.01 Painel e 08.02 Ficha individual dependem de Entregas (Sprint 8) e Funcionários (Sprint 5) já existirem.
- **Sprint 3 — Autenticação e segurança:** além de 01.01 Login, incluir explicitamente 10.03 (Usuários e permissões) e 10.10 (Auditoria e segurança) nesta sprint em vez de tratá-las como pendência sem dono (risco 5); adicionar ao escopo uma tela de recuperação de senha (risco 2) ou registrar a decisão de não ter uma na v1.
- **Sprint 11 — Qualidade, piloto e lançamento:** os 9 modais dos módulos 10 (Configurações) e 11 (Estados) devem estar prontos como componentes genéricos bem antes desta sprint — aqui só cabe testá-los de ponta a ponta nos fluxos reais, não implementá-los pela primeira vez.

## Referências

- [Protótipo no Figma](https://www.figma.com/design/OCaFMqFyl4bmSAvZaK4Y0D)
- [Regras de negócio](../02-requisitos/regras-de-negocio.md)
- [Auditoria estrutural do Figma](../04-ux-ui/auditoria-figma.md)
- [Plano de sprints](../../gestao/sprints/README.md)
