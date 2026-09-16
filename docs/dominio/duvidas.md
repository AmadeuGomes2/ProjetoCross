# Dúvidas do domínio

Ambiguidades levantadas na leitura da planilha, com o estado de cada uma depois da
inversão central (a planilha é a saída, não a entrada — ver `docs/spec.md`).

Três estados possíveis:

- **RESOLVIDA PELA INVERSÃO** — a dúvida existia porque alguém teria que adivinhar
  o que a planilha quis dizer. Como o sistema passa a produzir o dado em vez de
  interpretá-lo, a pergunta deixa de ter objeto. Fica registrada a decisão
  implícita.
- **DECISÃO DE PRODUTO PENDENTE** — continua sendo uma pergunta real, e a resposta
  muda o que o sistema faz. Precisa de resposta humana antes da implementação da
  parte correspondente.
- **RESPONDIDA em AAAA-MM-DD** — quem responde pelo produto decidiu, com data. A
  resposta está escrita aqui e aplicada no PRD.

Nenhuma dúvida pendente foi preenchida com palpite.

As respostas de **16/09/2026** vieram da folha `docs/prd/v1-decisoes.md`, em que
todas as sugestões foram aceitas, e estão aplicadas em `docs/prd/v1.md`, seção
DECISÕES TOMADAS. O código entre parênteses (`1.1`, `2.3`, ...) é o da folha.

---

## 1. Qual é o número de contrato canônico?

**Estado: RESPONDIDA em 16/09/2026**

O mesmo arquivo traz três identificações:

- `00!G7` = `190/2026`
- `01!G7` a `31!G7` = `P0476/01-25 - BLOCO 02`
- nome do arquivo = `190 PMMC - BLOCO 02`

A inversão elimina a **divergência** (passa a existir um campo só, preenchido uma
vez no cadastro da obra), mas não respondia **qual valor** vai nele, nem se são
dois identificadores legítimos e coexistentes.

**Resposta (8.1, 8.2):** um campo só na entidade Obra, chamado contrato, impresso
em `CONTRATO:` do cabeçalho. O valor da obra real é `P0476/01-25 - BLOCO 02`, que é
o que está nas 31 abas de RDO e o que o fiscal reconhece. `190/2026` e
`190 PMMC - BLOCO 02` não têm campo no sistema e não vão ao documento.

**Impacto se errado:** o RDO sai com o contrato errado no cabeçalho e o fiscal
rejeita.

---

## 2. Qual é o ciclo de medição do BMS e a que período o BMS 7 corresponde?

**Estado: RESPONDIDA em 16/09/2026**

Três informações que não fechavam:

- `DADOS!B3:D42` define 40 períodos de 16 de um mês a 15 do seguinte, indo de
  2022 a 2025, sem nenhuma linha em 2026.
- As 31 abas de RDO trazem BMS 7, digitado à mão, para setembro de 2026.
- Os títulos de seção falam em `BMS 001 - 05/02/2026 a 28/02/2026`, um período de
  24 dias, que não segue o ciclo 16 a 15 nem fecha mês cheio.

**Resposta (7.1):** o produto não deduz ciclo nenhum. Existe a entidade **Período
de BMS**, com número, data inicial e data final, cadastrada pelo engenheiro na
obra, com validação de que a final não é anterior à inicial. O BMS impresso no
cabeçalho é o número do período cujo intervalo contém a data do RDO. A tabela de
`DADOS` não é carregada.

**Completada em 16/09/2026 (21.1):** cadastrar ao menos um período de BMS é
**obrigatório ao criar a obra**, então a situação "obra sem período nenhum" deixa
de existir. Quando a data do RDO não é coberta por nenhum dos períodos
cadastrados, o campo `BM'S` sai **vazio**, a tela **avisa**, e o RDO é gerado
normalmente. Nada de bloquear a exportação por causa disso.

**Impacto se errado:** o número do BMS impresso é o que amarra o RDO à medição
financeira. Errar o BMS é errar a fatura.

---

## 3. Dia sem trabalho deve ser uma atividade ou um estado do dia?

**Estado: RESOLVIDA PELA INVERSÃO · confirmada por decisão explícita em
16/09/2026**

Na planilha, dia parado vira uma linha de atividade com o texto explicando o
motivo, e em 79 casos com status `Produção`, que é contraditório.

Como o sistema novo modela o **dia** como entidade própria, o dia passa a ter
estado explícito e tipado, separado da lista de atividades. Um dia parado tem zero
atividades e um motivo escolhido de lista. O texto livre vira complemento, não
classificação.

**Decisão registrada, agora com aprovação explícita (4.1, 4.2, 4.3):**

- o estado do dia é campo próprio e tem **três valores**: `não lançado`, `parado`,
  `trabalhado` (4.2). `não lançado` é a ausência de registro, não um valor
  digitado;
- dia parado tem motivo e **zero atividades**; a forma do motivo é texto livre
  obrigatório, ver 20.1 abaixo; no PDF, o motivo sai na
  **primeira linha do bloco `ATIVIDADES`**, que é onde o fiscal está acostumado a
  lê-lo (4.1);
- atividade lançada num dia parado é **rejeitada com mensagem**; não muda o estado
  do dia por efeito colateral (4.3);
- a lista de motivos é tabela de domínio editável.

**Completada em 16/09/2026 (20.1):** o motivo é **texto livre e obrigatório**
quando o dia é parado. As oito sugestões extraídas dos registros reais — `Domingo`,
`Feriado`, `Chuva`, `Excesso de umidade no trecho`, `Interferência de terceiro`,
`Impraticável`, `Sem frente de serviço`, `Outro` — aparecem como botões que
preenchem o campo ao toque, sem fechá-lo. O campo `complemento do motivo` deixa de
existir, porque o motivo em texto livre já o absorve.

A extração achou **110 registros de dia parado com 13 textos distintos**, dos quais
**61 não declaravam motivo nenhum**. Como o motivo passa a ser obrigatório, esses
61 casos não se repetem: o encarregado toca uma sugestão ou escreve.

**Risco assumido conscientemente:** texto livre é o que a planilha fazia, e é por
isso que hoje não dá para filtrar dias parados sem interpretar texto. As sugestões
existem justamente para que a maioria dos lançamentos caia em oito grafias
estáveis. Se a dispersão voltar, a correção é promover as sugestões a lista
fechada, não culpar o encarregado.

---

## 4. Qual é a fonte da verdade do tempo do dia?

**Estado: RESPONDIDA em 16/09/2026**

Havia duas, e elas não conversavam:

- `ATIVIDADES!D` guardava uma condição de tempo **por atividade**, de uma lista de
  6 termos. Um dia com 5 atividades tinha 5 valores de tempo, na prática iguais.
- `PLUVIOMETRIA` guarda **três turnos e um índice em mm por dia**, de uma lista de
  3 letras, e deriva o resumo do dia.

**Resposta (2.1, 2.2, 2.3):** o tempo é **do dia** e é lançado **só** como três
turnos (`B`, `C`, `I`) mais o índice em mm. A **condição de tempo de 6 termos
deixa de existir**: sai do lançamento de atividade, sai do dia e sai da carga
inicial de taxonomias. Turno em branco é aceito — domingo real fica assim (2.2). O
PDF imprime **a letra** em `NOITE ANTER`, `MANHÃ` e `TARDE` (2.3), como a fórmula
da planilha já faz; não há texto por extenso.

**Consequência derivada, não decisão nova:** sobra a taxonomia `Letra de turno`
com `B`, `C`, `I`. A skill `fidelidade-documento` diz "por extenso, capitalizada"
e precisa ser corrigida por quem responde por ela.

**Impacto se errado:** ou pedimos ao encarregado a mesma informação duas vezes, o
que fere a restrição de lançamento rápido em celular, ou perdemos o dado que o
fiscal usa para justificar paralisação por chuva.

---

## 5. A pessoa conta no efetivo do dia em que sai?

**Estado: RESPONDIDA em 16/09/2026**

A planilha respondia das duas formas ao mesmo tempo: as colunas `B17` a `S17` não
contam a pessoa no dia da saída, as colunas `T17` a `AP17` contam. O bloco de
equipamento conta em todas as colunas. Detalhado em `regras-extraidas.md`,
seção 1.1 e 1.2.

Hoje o defeito é invisível porque nenhuma das 19 pessoas tem data de saída.

**Resposta (1.1, 1.2):** a data de saída é o **último dia trabalhado**, e a pessoa
**conta** no efetivo desse dia. A regra é uma só, para toda função e toda coluna:

> conta no dia D quando `entrada ≤ D` **e** (`saída` nula **ou** `saída ≥ D`)

Equipamento segue **a mesma regra** (1.2).

**Impacto se errado:** o efetivo do RDO diverge da folha de ponto em um dia por
desligamento. É o tipo de divergência que o fiscal encontra.

**Caso de teste obrigatório** já registrado, agora com valor esperado.

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

**Nota de fidelidade — RESPONDIDA em 16/09/2026 (17.1):** os espaços sobrando
existem também nos textos fixos do cabeçalho do RDO, por exemplo
`MONTES CLAROS - MG ` e `Victor Rebello Byrro `. **Normalizar**, sem os espaços:
são resto de digitação, não intenção de layout. O agente de fidelidade compara
contra o texto normalizado e não aponta o espaço ausente como divergência.

---

## 11. Presença é diária ou derivada do intervalo?

**Estado: RESPONDIDA em 16/09/2026**

A planilha deriva o efetivo do intervalo de entrada e saída, sem nenhum registro
de presença. Quem entrou e não saiu é contado todos os dias, inclusive domingos e
dias em que a atividade registrada foi "não houve atividades". Por isso o efetivo
é 19 em todos os 31 dias de setembro.

**Resposta (5.1):** efetivo **mobilizado**, derivado do intervalo, **zerado quando
o estado do dia é `parado`**. Vale para os dois blocos do documento, pessoal e
equipamento — é "o efetivo do RDO". Não há marcação de ausência: controle de
presença diária continua fora da v1, porque seria mais um lançamento por dia e
pesa na restrição de celular.

**Impacto se errado:** o efetivo do RDO é um dos números que o fiscal confere
contra o que ele vê em campo. Mostrar 19 num domingo em que a obra estava parada
enfraquece o documento.

---

## 12. O número do RDO é recalculado ou congelado?

**Estado: RESPONDIDA em 16/09/2026**

Na planilha o número é a data do RDO menos a data de início do contrato,
recalculado toda vez que o arquivo abre. Consequências: o primeiro dia é o RDO
**zero**, e uma correção na data de início do contrato **renumera retroativamente
todos os RDOs já entregues ao fiscal**.

**Resposta (6.1, 6.2):** o primeiro dia do contrato é **RDO 0**, como hoje — o
fiscal já recebeu sete meses assim. A fórmula continua sendo `data − data de
início`, em dias corridos, e o número **congela no fechamento do dia**: o que já
foi fechado não é renumerado se a data de início mudar. Enquanto o dia está
aberto, o número é derivado.

Congelar o número não fere "RDO nunca armazenado pronto": o que se grava é o
identificador do documento entregue, não o conteúdo do RDO.

**Impacto se errado:** dois documentos com o mesmo número, ou o mesmo dia com dois
números diferentes em entregas sucessivas. Problema de rastreabilidade contratual.
