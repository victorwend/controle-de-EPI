# Sprint 10 — Histórico, dashboard e relatórios

## Objetivo

Transformar os registros operacionais em consulta, acompanhamento e comprovação.

## Tarefas

- [x] Exibir histórico completo por funcionário. (04.03 Ficha + 04.04 Histórico completo, com filtro Todos/Entregas/Trocas/Devoluções)
- [x] Exibir movimentações por EPI, obra, local, período e responsável. (Dashboard + Relatórios cobrem EPI/obra/responsável; filtro de período no Painel é só de exibição — não refiltra os números ainda, ver Pendências no README)
- [x] Criar visão detalhada da obra com funcionários, estoque e pendências. (já existia desde a Sprint 4 — `ObraDetalhe.jsx`/07.02 — nenhuma mudança nova aqui)
- [x] Montar dashboard com indicadores validados. (`Dashboard.jsx`, 02.01)
- [x] Exibir estoque crítico, CAs próximos do vencimento e pendências. (cards do Dashboard + "Pendências" do Painel de relatórios)
- [x] Criar ficha individual de EPI. (`FichaEpiIndividual.jsx`, 08.02)
- [x] Criar filtros por período, obra, funcionário, função, EPI e status. (período e obra no Painel de relatórios; funcionário/função/EPI/status já existiam nas listas das Sprints 5/6)
- [x] Exportar os relatórios autorizados. (botão "Exportar relatório" gera CSV com Blob, sem dependência nova)
- [x] Preparar impressão e PDF. (`window.print()` na Ficha individual de EPI, layout próprio sem menu lateral)
- [x] Garantir que os números do dashboard sejam rastreáveis até os registros. ("Movimentações recentes" usa o mesmo array `ENTREGAS` da lista de Entregas; "Ver todas" leva para lá)
- [ ] Restringir dados conforme o perfil do usuário. (depende de autenticação real — Sprint 3 ainda não iniciada, ver README)
- [ ] Validar relatórios com SST, RH e gestão. (passo organizacional, não é tarefa de código)

## Critérios de aceite

- [x] Totais dos relatórios conferem com os registros de origem. (347 entregas no período = mesmo total do Dashboard e da Lista de entregas)
- [x] Ficha individual pode ser usada em auditoria. (Termo de responsabilidade com aceite/data/responsável reais do próprio funcionário)
- [x] Usuário consegue localizar uma entrega e sua movimentação correspondente. (Dashboard → Ver todas → Entregas; Ficha → Histórico completo)
