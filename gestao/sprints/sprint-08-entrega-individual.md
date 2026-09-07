# Sprint 8 — Entrega individual

## Objetivo

Registrar a entrega de EPI a um funcionário com baixa automática e aceite.

## Tarefas

- [x] Selecionar funcionário ativo.
- [x] Exibir obra, função e situação do funcionário.
- [x] Sugerir EPIs pela matriz da função.
- [x] Selecionar EPI, CA, quantidade e local de estoque. (local de estoque fixo em "Almoxarifado Central" — o Figma, 03.03, não desenha um seletor de local nesta tela; ver README)
- [x] Validar saldo, CA, duplicidade e periodicidade. (saldo e duplicidade validados; CA vencido e periodicidade ainda não têm checagem própria — nenhuma das duas telas do Figma, 03.03/03.04, mostra essa validação)
- [x] Exibir resumo antes da confirmação.
- [x] Confirmar por biometria ou método de aceite permitido. (só biometria — 03.04 não desenha um método alternativo)
- [x] Tratar biometria ausente, não reconhecida e leitor desconectado.
- [x] Registrar entrega e baixa de estoque na mesma operação. (mock local, sem backend — mesmo padrão das demais sprints)
- [x] Gerar comprovante da entrega.
- [x] Mostrar estado de sucesso ou erro sem duplicar operação.
- [x] Registrar usuário responsável e dados de auditoria. (usuário fixo do cabeçalho, "Vitor • Administrador"; data/hora da confirmação biométrica citadas em texto, sem persistência real)

## Critérios de aceite

- [x] Entrega e baixa são concluídas juntas ou nenhuma é gravada.
- [x] Não há entrega com saldo insuficiente. (bloqueio replicando 05.05, ver Roadmap do README)
- [x] O comprovante identifica funcionário, itens, aceite e responsável.
