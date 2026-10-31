# Como contribuir

Este repositório usa um fluxo colaborativo adaptado a uma dupla iniciante, mantendo práticas profissionais.

## Antes de começar

1. Escolha uma tarefa pronta no Notion.
2. Confirme requisito, regra de negócio, critérios de aceite, dependências, risco e estimativa.
3. Garanta que a tarefa esteja marcada como **Pronto para iniciar**.
4. Mova a tarefa para **Em andamento**.
5. Crie uma branch a partir de `develop`.

## Branches

- `main`: versão estável.
- `develop`: integração da próxima versão.
- `feature/TASK-123-descricao`: funcionalidade.
- `fix/TASK-123-descricao`: correção.
- `test/TASK-123-descricao`: testes.
- `docs/TASK-123-descricao`: documentação.
- `refactor/TASK-123-descricao`: melhoria interna.

Não faça commit direto em `main`.

## Commits

Use mensagens curtas e objetivas:

- `feat: adiciona página de login`
- `fix: impede saldo negativo`
- `docs: atualiza contrato da API`
- `test: cobre retirada duplicada`
- `refactor: separa regra de estoque do endpoint`
- `chore: configura ferramentas do projeto`

## Pull Request

1. Envie a branch.
2. Abra PR para `develop`.
3. Preencha o template completo.
4. Vincule a tarefa do Notion.
5. Aguarde revisão do parceiro.
6. Corrija os apontamentos.
7. Faça merge somente com verificações aprovadas.

Quem implementa não aprova o próprio PR.

## Definition of Done

A tarefa só termina quando os critérios de aceite, testes, revisão, documentação, evidência e ambiente estiverem atualizados.
