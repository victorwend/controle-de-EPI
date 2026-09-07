# Sprint 9 — Troca, devolução e entrega em lote

## Objetivo

Completar as operações de entrega previstas no Figma.

## Tarefas

- [x] Registrar devolução com item, quantidade, data, condição e motivo. (quantidade fixa em 1 por item — 03.08 não tem coluna de quantidade; condição não é um campo próprio, o destino Estoque/Descarte já expressa se o item volta utilizável)
- [x] Definir quando o item devolvido retorna ao estoque. (destino "Estoque" por item, escolha manual por linha — RN048)
- [x] Registrar descarte ou item inutilizável sem aumentar saldo. (destino "Descarte" não soma ao resumo de retorno — RN064)
- [x] Registrar troca vinculando entrega anterior, devolução e novo item. (ação "Trocar" gera devolução do item + nova unidade entregue no resumo — RN063)
- [x] Evitar duplicidade em tentativas repetidas. (cada item só pode ser marcado uma vez por movimentação; formulário reseta ao trocar de funcionário)
- [x] Selecionar obra, equipe, função e funcionários para entrega em lote.
- [x] Sugerir itens pela matriz da função. (só itens "Obrigatório"; "Recomendado" fica fora do lote, mesma regra usada na Sprint 8)
- [x] Validar saldo total antes de confirmar o lote. (bloqueia "Continuar" com o total necessário x saldo disponível, RN070)
- [x] Exigir aceite individual conforme a regra definida. (cada funcionário confirma a própria linha antes de liberar "Concluir lote" — RN071)
- [x] Permitir identificar falhas individuais sem perder o lote inteiro. ("Marcar falha" + "Tentar novamente" por pessoa, sem bloquear as demais — RN072)
- [x] Gerar comprovantes e movimentações correspondentes. (um comprovante por funcionário confirmado, mesmo padrão da Sprint 8)
- [x] Registrar auditoria completa. (usuário fixo do cabeçalho, mesmo padrão simplificado da Sprint 8 — sem persistência real)

## Critérios de aceite

- [x] Devolução altera o saldo somente quando permitido. (Descarte nunca retorna; Estoque sempre retorna)
- [x] Troca preserva vínculo entre os movimentos. (resumo lista devolução + nova unidade lado a lado por item)
- [x] Entrega em lote não ultrapassa o estoque e identifica cada recebedor. (bloqueio por saldo total antes de continuar; cada linha nomeia o funcionário)
