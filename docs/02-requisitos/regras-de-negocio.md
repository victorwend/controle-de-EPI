# Regras de Negócio — Sistema de Controle de EPIs

Versão inicial: 06/09/2026  
Status: **Proposta para validação**

Estas regras foram derivadas do protótipo do Figma e do escopo atual. Almoxarifado, SST, RH, administração e gestão devem confirmar as regras antes do desenvolvimento.

## 1. Regras gerais

- **RN001 — Identificação:** todo registro principal deve possuir identificador único.
- **RN002 — Rastreabilidade:** operações que alteram dados ou estoque devem registrar usuário, data e hora.
- **RN003 — Exclusão:** registros já utilizados não devem ser apagados definitivamente; devem ser inativados.
- **RN004 — Consistência:** uma operação com várias alterações deve concluir tudo ou não concluir nada.
- **RN005 — Duplicidade:** o sistema deve impedir cadastros duplicados conforme os campos únicos definidos.
- **RN006 — Histórico:** alterações não devem modificar retroativamente documentos e entregas concluídos.
- **RN007 — Contexto:** registros operacionais devem estar vinculados à empresa e, quando aplicável, à obra.
- **RN008 — Estado:** somente registros ativos podem ser usados em novas operações.

## 2. Usuários, acesso e auditoria

- **RN009 — Autenticação:** somente usuário autenticado pode acessar funções internas.
- **RN010 — Autorização:** cada ação deve respeitar as permissões do perfil do usuário.
- **RN011 — Escopo por obra:** usuário limitado a uma obra não pode consultar ou alterar dados de outra.
- **RN012 — Administração:** somente perfil autorizado pode alterar permissões e configurações.
- **RN013 — Sessão:** sessões inativas devem expirar conforme parâmetro definido.
- **RN014 — Tentativas:** tentativas malsucedidas devem ser registradas e limitadas.
- **RN015 — Auditoria:** ajustes de estoque, exclusões lógicas, permissões e configurações devem possuir auditoria.
- **RN016 — Imutabilidade:** registros de auditoria não podem ser alterados pelo usuário operacional.

## 3. Funcionários

- **RN017 — Matrícula:** cada funcionário deve possuir matrícula única dentro da empresa.
- **RN018 — Vínculos:** funcionário ativo deve estar vinculado a obra, setor e função válidos.
- **RN019 — Inativação:** funcionário inativo permanece no histórico, mas não recebe nova entrega.
- **RN020 — Transferência:** transferência deve informar obra atual, nova obra, motivo e data efetiva.
- **RN021 — Preservação:** transferência não altera o vínculo histórico das entregas anteriores.
- **RN022 — Pendência:** antes da transferência, o sistema deve informar EPIs ativos e pendências.
- **RN023 — Ficha:** a ficha deve separar dados atuais de registros históricos.

## 4. Biometria e aceite

- **RN024 — Finalidade:** biometria só pode ser usada para finalidade definida e por usuário autorizado.
- **RN025 — Cadastro:** uma biometria deve ser vinculada a um único funcionário ativo.
- **RN026 — Confirmação:** o cadastro biométrico exige captura e confirmação antes da ativação.
- **RN027 — Falhas distintas:** o sistema deve diferenciar biometria ausente, não reconhecida e leitor desconectado.
- **RN028 — Alternativa:** método alternativo só pode ser usado quando configurado e autorizado.
- **RN029 — Evidência:** o aceite deve registrar método, data, hora, funcionário e operação.
- **RN030 — Proteção:** dados biométricos não devem aparecer em relatórios ou exportações comuns.
- **RN031 — Conformidade:** coleta, retenção e exclusão de biometria exigem validação de privacidade antes do uso real.

## 5. EPIs, CAs e matriz por função

- **RN032 — Cadastro do EPI:** EPI deve possuir descrição, categoria e unidade de controle.
- **RN033 — CA:** quando exigido, o EPI deve possuir CA identificado e com situação conhecida.
- **RN034 — Validade:** a validade do CA deve ser verificada na data da entrega.
- **RN035 — CA vencido:** EPI com CA vencido não pode ser entregue quando o SST exigir CA válido.
- **RN036 — Renovação:** novo CA não deve apagar o CA utilizado em entregas anteriores.
- **RN037 — Matriz:** a matriz deve relacionar função, EPI, obrigatoriedade, quantidade e periodicidade.
- **RN038 — Sugestão:** a seleção do funcionário deve sugerir EPIs da matriz da função.
- **RN039 — Exceção:** entrega fora da matriz deve exigir permissão e justificativa quando configurado.
- **RN040 — Pendência:** funcionário sem EPI obrigatório válido deve aparecer como pendente.

## 6. Estoque

- **RN041 — Saldo por local:** o saldo deve ser controlado por EPI, CA, obra e local.
- **RN042 — Movimentação:** toda alteração de saldo deve gerar movimentação.
- **RN043 — Saldo negativo:** nenhuma operação pode resultar em saldo menor que zero.
- **RN044 — Entrada:** entrada deve informar item, CA, quantidade, origem, documento, local e responsável.
- **RN045 — Transferência:** transferência deve atualizar origem e destino na mesma operação.
- **RN046 — Origem e destino:** transferência para o mesmo local deve ser bloqueada.
- **RN047 — Ajuste:** ajuste manual deve exigir motivo e permissão específica.
- **RN048 — Retorno ao estoque:** item devolvido só aumenta o saldo se estiver apto e a política permitir.
- **RN049 — Estoque mínimo:** alerta deve ser gerado quando o saldo atingir ou ficar abaixo do mínimo.
- **RN050 — Cancelamento:** cancelamento deve criar estorno rastreável sem apagar a movimentação original.

## 7. Entrega individual

- **RN051 — Elegibilidade:** somente funcionário ativo pode receber EPI.
- **RN052 — Seleção:** entrega deve identificar funcionário, item, CA, quantidade, local e responsável.
- **RN053 — Validação prévia:** saldo, CA, matriz, quantidade e periodicidade devem ser validados.
- **RN054 — Baixa automática:** confirmação deve criar entrega e baixa na mesma operação.
- **RN055 — Estoque insuficiente:** entrega deve ser bloqueada quando superar o saldo disponível.
- **RN056 — Aceite:** entrega só é concluída após o método de aceite definido.
- **RN057 — Idempotência:** repetição por falha de conexão não deve criar entrega duplicada.
- **RN058 — Comprovante:** entrega concluída deve gerar comprovante com itens, aceite e responsáveis.
- **RN059 — Cancelamento:** entrega concluída não deve ser apagada; correção exige cancelamento ou estorno.

## 8. Troca e devolução

- **RN060 — Referência:** troca ou devolução deve referenciar a entrega original quando ela existir.
- **RN061 — Motivo:** troca e devolução devem possuir motivo obrigatório.
- **RN062 — Condição:** devolução deve registrar a condição do item.
- **RN063 — Troca:** troca deve vincular item devolvido ao novo item entregue.
- **RN064 — Descarte:** item descartado ou inutilizável não deve retornar ao saldo disponível.
- **RN065 — Quantidade:** quantidade devolvida não pode superar a quantidade elegível.
- **RN066 — Movimentações:** retorno, descarte e nova entrega devem possuir movimentos separados e vinculados.

## 9. Entrega em lote

- **RN067 — Participantes:** lote deve identificar individualmente todos os funcionários.
- **RN068 — Elegibilidade:** funcionários inativos ou fora do escopo devem ser bloqueados.
- **RN069 — Total:** o sistema deve calcular a necessidade total antes da confirmação.
- **RN070 — Reserva:** o lote só pode prosseguir se houver saldo suficiente.
- **RN071 — Aceite individual:** cada funcionário deve possuir seu aceite quando obrigatório.
- **RN072 — Falha parcial:** falha de um funcionário não deve duplicar entregas concluídas.
- **RN073 — Comprovantes:** cada funcionário deve possuir comprovante individual.

## 10. Relatórios, alertas e exportações

- **RN074 — Fonte:** indicadores e relatórios devem ser calculados dos registros operacionais.
- **RN075 — Filtros:** relatórios devem respeitar período, obra e permissões.
- **RN076 — Ficha individual:** a ficha deve apresentar entregas, devoluções, trocas, ativos e aceite.
- **RN077 — Exportação:** arquivo exportado deve registrar data de geração e filtros.
- **RN078 — Proteção:** exportações não devem incluir senha, biometria ou informação desnecessária.
- **RN079 — Alertas de CA:** prazo de antecedência deve ser configurável.
- **RN080 — Alertas de estoque:** destinatários devem ser definidos por obra ou responsabilidade.
- **RN081 — Notificação:** falha no envio não pode desfazer a operação principal.
- **RN082 — Auditoria do relatório:** dados devem ser rastreáveis até os registros de origem.

## Decisões pendentes

- [ ] Definir quando EPI devolvido pode retornar ao estoque.
- [ ] Definir periodicidade por função e EPI.
- [ ] Definir se entrega fora da matriz será bloqueada ou justificada.
- [ ] Definir métodos alternativos à biometria.
- [ ] Definir prazos dos alertas de CA e estoque.
- [ ] Definir quem pode ajustar estoque e cancelar operações.
- [ ] Definir retenção de documentos, auditoria e biometria.
- [ ] Definir relatórios disponíveis para cada perfil.

## Referências

- [Protótipo no Figma](https://www.figma.com/design/OCaFMqFyl4bmSAvZaK4Y0D)
- [Plano de sprints](../../gestao/sprints/README.md)
- [Backlog no Notion](https://app.notion.com/p/23716deb7120487ea6d9a389d9dc3cf6)
