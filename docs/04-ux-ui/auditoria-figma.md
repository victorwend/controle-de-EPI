# Auditoria do protótipo no Figma

Data da revisão: 06/09/2026  
Arquivo analisado: [Controle de EPIs no Figma](https://www.figma.com/design/OCaFMqFyl4bmSAvZaK4Y0D)

## Resultado geral

O arquivo possui 63 telas/estados principais em uma única página. Foram identificados fluxos de autenticação, dashboard, entregas, funcionários, estoque, EPIs e CAs, obras, relatórios, cadastros, configurações e mensagens de sucesso ou erro.

Todas as telas possuem ao menos uma interação configurada. A contagem técnica encontrou 768 reações no arquivo; esse total inclui links repetidos da navegação lateral em cada tela e não representa 768 fluxos exclusivos.

## Funcionalidades representadas

- Login.
- Dashboard operacional.
- Entrega individual de EPI.
- Confirmação por biometria e estados de falha.
- Entrega em lote.
- Troca e devolução.
- Cadastro, ficha, histórico e transferência de funcionário.
- Cadastro de EPI, controle de CA e matriz EPI por função.
- Entrada, transferência e movimentações de estoque.
- Bloqueio por saldo insuficiente.
- Obras e visão detalhada por obra.
- Relatórios e ficha individual para impressão/PDF.
- Cadastros auxiliares.
- Configurações de regras, alertas, aceite, notificações, integrações, auditoria e segurança.
- Estados de sucesso, erro e confirmação de exclusão.

## Pontos positivos

- Os módulos principais estão organizados nas abas corretas.
- O fluxo de entrega cobre confirmação e exceções biométricas.
- Estoque, funcionário e entrega possuem rastreabilidade prevista.
- O protótipo inclui situações de erro, vazio e sucesso.
- As telas avançadas solicitadas — troca/devolução, saldo insuficiente, histórico completo, matriz EPI por função e entrega em lote — estão presentes.

## Lacunas antes do desenvolvimento

1. Não existem componentes reutilizáveis cadastrados no arquivo.
2. Não existem variáveis de cores, espaçamento ou tipografia.
3. Das 63 telas, 58 são desktop em 1440 × 1024; não foram encontradas telas mobile ou tablet.
4. Há uma tela antiga com nome `15 — Devolução ou troca de EPI` e outra organizada como `03.08 — Entregas — Troca e devolução`. É necessário decidir qual é a versão oficial e arquivar/remover a duplicada.
5. Não foi identificada uma tela nomeada `05.01 — Estoque — Visão geral`; o fluxo começa em `05.02 — Entrada`.
6. O Figma representa a interface, mas ainda é necessário documentar regras de negócio, permissões, modelo de dados, integrações e critérios de aceite.
7. Antes de programar, o protótipo deve passar por validação com usuários da operação: almoxarifado, SST, RH e administração.

## Decisão para o planejamento

As sprints começam pela validação e organização do produto. O desenvolvimento só deve iniciar depois de requisitos, regras de negócio, design system e modelo de dados estarem suficientemente definidos.
