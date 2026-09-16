# Dúvidas do domínio

Ambiguidades levantadas na leitura da planilha, com o estado de cada uma depois da
inversão central (a planilha é a saída, não a entrada — ver `docs/spec.md`).

Dois estados possíveis:

- **RESOLVIDA PELA INVERSÃO** — a dúvida existia porque alguém teria que adivinhar
  o que a planilha quis dizer. Como o sistema passa a produzir o dado em vez de
  interpretá-lo, a pergunta deixa de ter objeto. Fica registrada a decisão
  implícita.
- **DECISÃO DE PRODUTO PENDENTE** — continua sendo uma pergunta real, e a resposta
  muda o que o sistema faz. Precisa de resposta humana antes da implementação da
  parte correspondente.

Nenhuma dúvida pendente foi preenchida com palpite.

---

## 1. Qual é o número de contrato canônico?

**Estado: DECISÃO DE PRODUTO PENDENTE**

O mesmo arquivo traz três identificações:

- `00!G7` = `190/2026`
- `01!G7` a `31!G7` = `P0476/01-25 - BLOCO 02`
- nome do arquivo = `190 PMMC - BLOCO 02`

A inversão elimina a **divergência** (passa a existir um campo só, preenchido uma
vez no cadastro da obra), mas não responde **qual valor** vai nele, nem se são dois
identificadores legítimos e coexistentes: um número de contrato e um código
interno de proposta.

**O que preciso saber:** os três se referem ao mesmo contrato? Se sim, qual é o
número que o fiscal da Prefeitura reconhece no documento impresso? Precisamos de
dois campos separados, contrato e código interno?

**Impacto se errado:** o RDO sai com o contrato errado no cabeçalho e o fiscal
rejeita.

---

## 2. Qual é o ciclo de medição do BMS e a que período o BMS 7 corresponde?

**Estado: DECISÃO DE PRODUTO PENDENTE**

Três informações que não fecham:

- `DADOS!B3:D42` define 40 períodos de 16 de um mês a 15 do seguinte, indo de
  2022 a 2025, sem nenhuma linha em 2026.
- As 31 abas de RDO trazem BMS 7, digitado à mão, para setembro de 2026.
- Os títulos de seção falam em `BMS 001 - 05/02/2026 a 28/02/2026`, um período de
  24 dias, que não segue o ciclo 16 a 15 nem fecha mês cheio.

Se a obra começou em 05/02/2026 e o BMS 001 foi 05/02 a 28/02, o BMS 7 cairia em
agosto, não em setembro. Se o ciclo fosse mensal cheio a partir de março, o BMS 7
cairia em setembro. A segunda hipótese fecha, mas é hipótese.

**O que preciso saber:** o BMS é mensal cheio a partir do segundo período? O
primeiro período é sempre quebrado, do início do contrato até o fim do mês? A
tabela em `DADOS` é lixo herdado de outra obra?

**Impacto se errado:** o número do BMS impresso é o que amarra o RDO à medição
financeira. Errar o BMS é errar a fatura.

---

## 3. Dia sem trabalho deve ser uma atividade ou um estado do dia?

**Estado: RESOLVIDA PELA INVERSÃO**

Na planilha, dia parado vira uma linha de atividade com o texto explicando o
motivo, e em 79 casos com status `Produção`, que é contraditório.

Como o sistema novo modela o **dia** como entidade própria, o dia passa a ter
estado explícito e tipado, separado da lista de atividades. Um dia parado tem zero
atividades e um motivo escolhido de lista (domingo, feriado, chuva, impraticável,
sem frente de serviço, outro). O texto livre vira complemento, não classificação.

**Decisão registrada:** estado do dia é campo próprio; a lista de motivos é tabela
de domínio editável. O RDO renderiza o dia parado com o motivo, não com uma
atividade falsa.

**Continua pendente, em escala menor:** a lista exata de motivos, que deve sair da
leitura dos 79 textos reais. Não inventei a lista.

---

## 4. Qual é a fonte da verdade do tempo do dia?

**Estado: DECISÃO DE PRODUTO PENDENTE**

Há duas, e elas não conversam:

- `ATIVIDADES!D` guarda uma condição de tempo **por atividade**, de uma lista de 6
  termos. Um dia com 5 atividades tem 5 valores de tempo, na prática sempre iguais.
- `PLUVIOMETRIA` guarda **três turnos e um índice em mm por dia**, de uma lista de
  3 letras, e deriva o resumo do dia.

O RDO imprime os dois: a condição de tempo aparece implícita nas atividades e os
turnos aparecem no bloco de pluviometria. Não há regra que force coerência entre
"Bom" na atividade e "C" no turno da manhã.

**O que preciso saber:** o tempo é do dia ou da atividade? Se é do dia, a lista de
6 termos e a de 3 letras são a mesma coisa em dois níveis de detalhe, ou medem
coisas diferentes (percepção contra medição)? O encarregado deve lançar as duas?

**Impacto se errado:** ou pedimos ao encarregado a mesma informação duas vezes, o
que fere a restrição de lançamento rápido em celular, ou perdemos o dado que o
fiscal usa para justificar paralisação por chuva.

---

## 5. A pessoa conta no efetivo do dia em que sai?

**Estado: DECISÃO DE PRODUTO PENDENTE**

A planilha responde das duas formas ao mesmo tempo: as colunas `B17` a `S17` não
contam a pessoa no dia da saída, as colunas `T17` a `AP17` contam. O bloco de
equipamento conta em todas as colunas. Detalhado em `regras-extraidas.md`,
seção 1.1 e 1.2.

Hoje o defeito é invisível porque nenhuma das 19 pessoas tem data de saída.

**O que preciso saber:** a data de saída é o último dia trabalhado, e portanto a
pessoa conta nele, ou é o dia em que ela deixou de estar na obra, e portanto não
conta? A mesma resposta vale para equipamento?

**Impacto se errado:** o efetivo do RDO diverge da folha de ponto em um dia por
desligamento. É o tipo de divergência que o fiscal encontra.

**Caso de teste obrigatório** já registrado, independentemente da resposta.

---

## 6. A quantidade de projeto vem do cadastro ou de arquivo externo?

**Estado: RESOLVIDA PELA INVERSÃO**

Na planilha, as 4 quantidades vêm por link de um `.xlsx` em servidor de arquivos
interno, e o valor em cache é usado em silêncio quando o arquivo não está
acessível.

No sistema novo o engenheiro responsável cadastra o serviço controlado com a
quantidade de projeto, como parte do cadastro da obra. Não há link externo, não há
cache silencioso, e a origem do número é uma pessoa identificada numa data.

**Decisão registrada:** quantidade de projeto é campo de cadastro, versionado. Se
mudar, o histórico mostra quem mudou e quando, e os percentuais já emitidos ficam
explicáveis.

**Fora do escopo da v1:** importar esse número do mapa de controle.

---

## 7. Qual é o mês de referência de um RDO, e a aba 31 deve existir?

**Estado: RESOLVIDA PELA INVERSÃO**

A pergunta só existia porque a planilha tem 31 abas fixas e três candidatos a mês
de referência que discordam entre si: o nome do arquivo (setembro), a data da aba
`01` (setembro) e a pluviometria (julho).

No sistema novo não existe aba de dia. Existe **lançamento com data** e existem
**visões** diária, semanal e mensal, que são consultas por período. Não há como
gerar um dia 31 de setembro, porque nenhum lançamento pode ter essa data.

**Decisão registrada:** o mês de referência é sempre derivado da data consultada.
Casos de teste de mês de 30 e de 28 dias continuam obrigatórios, para garantir que
a geração de período não invente dia.

---

## 8. O que significam PE, CV e PD no mapa linear?

**Estado: DECISÃO DE PRODUTO PENDENTE — e fora do escopo da v1**

Perguntas abertas sobre a aba `LINEAR`:

- O que são as siglas `PE`, `CV` e `PD`?
- Por que `PE` e `PD` têm 4 linhas cada, todas iguais por fórmula, e `CV` tem 1?
  São faixas de rolamento, bordo direito e esquerdo, camadas?
- O que é `APP` no rótulo de trecho, ao lado de `ENTRADA` e `ROTATÓRIA`?
- A legenda tem 4 códigos e mais `Pendências` sem código, mas a formatação
  condicional trata um código `5`. O que é o 5?
- O mapa é uma foto do estado atual ou deveria ter histórico por data?

A aba não tem coluna de data nem ligação com nenhuma outra. Sem isso, qualquer
modelagem seria chute.

**Decisão registrada:** `LINEAR` está fora da v1. A dúvida fica aberta para quando
entrar.

---

## 9. O sistema lê as abas de dia ou só as mestras?

**Estado: RESOLVIDA PELA INVERSÃO**

Era a pergunta central enquanto se supunha que o sistema fosse um leitor de
planilha. Com a inversão, **o sistema não lê planilha nenhuma**.

A planilha de referência passa a ter um papel só: ser o gabarito visual do PDF
exportado, guardado em `referencia/`, fora do repositório, consultado por pessoa e
pelo agente de fidelidade.

**Decisão registrada:** não existe importador no escopo. Se um dia existir, ele
seria uma migração única do histórico, com a regra dura de casar coluna por
cabeçalho e nunca por posição, dadas as dezenas de colunas de reserva.

---

## 10. Nome e função com espaço no fim: normalizar ou preservar?

**Estado: RESOLVIDA PELA INVERSÃO**

Na planilha, 6 dos 19 nomes e 3 das 12 funções têm espaço sobrando no fim, e a
lista de funções distintas propaga o espaço para o rótulo impresso. Casar por
igualdade exata de texto funciona por acaso.

No sistema novo função é **referência a um registro**, não texto solto. Nome é
campo com normalização de espaços nas pontas na entrada.

**Decisão registrada:** normalizar nas pontas ao gravar, preservar acentuação e
maiúsculas como digitadas, comparar de forma insensível a caixa e a espaços.
Caso de teste registrado.

**Nota de fidelidade:** os espaços sobrando existem também nos textos fixos do
cabeçalho do RDO, por exemplo `MONTES CLAROS - MG ` e `Victor Rebello Byrro `.
Ali eles afetam o alinhamento visual do documento impresso. O agente de fidelidade
precisa decidir, na comparação, se reproduz ou normaliza. Registrado como dúvida
de fidelidade, não de dado.

---

## 11. Presença é diária ou derivada do intervalo?

**Estado: DECISÃO DE PRODUTO PENDENTE**

A planilha deriva o efetivo do intervalo de entrada e saída, sem nenhum registro
de presença. Quem entrou e não saiu é contado todos os dias, inclusive domingos e
dias em que a atividade registrada foi "não houve atividades". Por isso o efetivo
é 19 em todos os 31 dias de setembro.

**O que preciso saber:** o RDO deve mostrar o efetivo **mobilizado** (quem está
alocado à obra) ou o efetivo **presente** (quem trabalhou naquele dia)? Se for
presente, o encarregado teria que marcar ausências, o que é mais um lançamento por
dia e pesa na restrição de celular.

**Impacto se errado:** o efetivo do RDO é um dos números que o fiscal confere
contra o que ele vê em campo. Mostrar 19 num domingo em que a obra estava parada
enfraquece o documento.

**Sugestão para você aprovar ou recusar:** manter derivado do intervalo na v1,
como está hoje, e exibir o efetivo do dia parado zerado quando o estado do dia for
parado. Não implementei nada disso.

---

## 12. O número do RDO é recalculado ou congelado?

**Estado: DECISÃO DE PRODUTO PENDENTE**

Na planilha o número é a data do RDO menos a data de início do contrato,
recalculado toda vez que o arquivo abre. Consequências: o primeiro dia é o RDO
**zero**, e uma correção na data de início do contrato **renumera retroativamente
todos os RDOs já entregues ao fiscal**.

**O que preciso saber:** o primeiro dia é RDO 0 ou RDO 1? O número deve ser
congelado no fechamento do dia, de forma que documentos já entregues nunca mudem
de número?

**Impacto se errado:** dois documentos com o mesmo número, ou o mesmo dia com dois
números diferentes em entregas sucessivas. Problema de rastreabilidade contratual.

**Sugestão para você aprovar ou recusar:** congelar o número no fechamento do dia
e manter a fórmula como valor inicial proposto. Não implementei nada disso.
