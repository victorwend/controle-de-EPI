# Sprint 7 — Estoque

## Objetivo

Controlar quantidades por obra e local com rastreabilidade completa.

## Tarefas

- [ ] Criar visão geral de estoque.
- [ ] Registrar entrada com origem, documento, quantidade e responsável.
- [ ] Consultar saldo por EPI, CA, obra e local.
- [ ] Transferir estoque entre obras e locais.
- [ ] Atualizar origem e destino na mesma operação.
- [ ] Registrar entradas, saídas, devoluções, ajustes e transferências.
- [ ] Bloquear operação que gere saldo negativo.
- [ ] Configurar estoque mínimo.
- [ ] Gerar alerta de item crítico.
- [ ] Criar estado vazio e mensagens de erro.
- [ ] Permitir consulta do histórico de movimentações.
- [ ] Registrar auditoria dos ajustes manuais.

## Critérios de aceite

- Nenhuma operação autorizada gera saldo negativo.
- Toda alteração de saldo possui movimentação correspondente.
- Transferências são atômicas: origem e destino atualizam juntas.
