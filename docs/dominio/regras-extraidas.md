# Regras de negócio extraídas da planilha

Cada regra abaixo foi lida nas fórmulas da planilha de referência e reescrita em
português. A fórmula original não é reproduzida: o que importa é a intenção.
A coluna **Herdar** diz se a regra vale para o produto novo ou se é defeito da
planilha que não deve ser copiado.

Fonte de cada regra está indicada como `ABA!CÉLULA`.

---

## 1. Efetivo de pessoal presente no dia

**Fonte:** `01!B17:AP17` (e idêntico em `02` a `31`).

A quantidade de pessoas de uma função presentes num dia é calculada, não digitada:

> conta quantas pessoas daquela função entraram na obra **até** o dia consultado,
> e subtrai quantas daquela função já saíram.

Ninguém marca presença. O sistema legado assume que quem entrou e não saiu está
presente todos os dias, inclusive domingo e feriado. Por isso o total do efetivo
é 19 em todos os 31 dias de setembro, mesmo nos dias em que a atividade registrada
foi "Não houve atividades".

**Herdar:** a regra do intervalo sim, a ausência de presença diária não
necessariamente. Ver `duvidas.md`, dúvida 11.

### 1.1. A divergência de menor-igual contra menor (defeito)

O critério de saída **não é o mesmo em todas as colunas da mesma linha**:

| Colunas                     | Critério da saída               | Efeito no dia da saída                   |
| --------------------------- | ------------------------------- | ---------------------------------------- |
| `B17` a `S17` (18 colunas)  | saída **menor ou igual** ao dia | a pessoa **não** conta no dia em que sai |
| `T17` a `AP17` (23 colunas) | saída **menor** que o dia       | a pessoa **conta** no dia em que sai     |

A mesma pessoa é contada ou não dependendo da coluna em que a função dela caiu.
A coluna depende da ordem de aparecimento na lista de funções, que por sua vez
depende de fórmula auxiliar. Ou seja: **o resultado depende de posição, não de
regra**.

Hoje o defeito é invisível porque nenhuma das 19 pessoas tem data de saída.
Ele aparece no primeiro desligamento.

**Herdar:** não. O produto novo precisa de **uma** regra explícita, decidida e
testada. Caso de teste obrigatório: pessoa com saída exatamente no dia consultado.

### 1.2. Efetivo de equipamento usa outro critério ainda

**Fonte:** `01!B23:AP23`.

Todas as 41 colunas do bloco de equipamento usam saída **menor** que o dia, sem
exceção. Portanto:

- equipamento que sai no dia **conta** naquele dia;
- pessoa que sai no dia conta ou não conforme a coluna.

Dois blocos do mesmo relatório, três comportamentos. Nenhum está documentado.

**Herdar:** não. Uma regra só, para pessoa e equipamento, ou duas regras
explicitamente diferentes e justificadas.

---

## 2. Agregação por função e por identificador

**Fonte:** `01!B14:AP14` (pessoal) e `01!B20:AP20` (equipamento).

- **Pessoal** é agregado por **função**, nunca por pessoa. O RDO mostra
  "Motorista: 4", não os nomes. Os nomes ficam só no cadastro.
  Isso é relevante para a LGPD: o relatório que circula não precisa expor nomes.
- **Equipamento** é agregado por **identificador individual** (CF-29, RE-17), não
  por tipo. Como cada identificador é único, a contagem é sempre 0 ou 1 e a
  agregação não agrega nada. O tipo (PATROL, ROLO) fica no cadastro e não aparece
  no RDO.

Duas granularidades opostas para blocos visualmente idênticos.

**Defeito associado:** a linha de rótulos de função na aba `01` lê **três fontes
diferentes** na mesma linha — a coluna `B` e as colunas `T` a `AP` leem a cópia
linha a linha das funções, que tem repetições, enquanto `C` a `R` leem a coluna
deduplicada, e `S` está vazia. O índice usado para percorrer essa lista é o número
de células preenchidas numa faixa do **bloco de equipamento**, logo o rótulo de
função depende de quantos equipamentos existem.

**Herdar:** a granularidade (função para pessoa, identificador para equipamento)
sim, se confirmada. O mecanismo, não.

---

## 3. Numeração do RDO

**Fonte:** `00!AO4` e `01!AO4`.

> Número do RDO = data do relatório menos a data de início do contrato.

Consequências, todas verificadas nos valores em cache:

- No dia do início do contrato, 05/02/2026, o RDO é o número **0**, não 1.
- Em 01/09/2026 o número é 208; em 30/09/2026 é 237; na aba `31` é 238.
- A contagem inclui sábados, domingos, feriados e dias parados. Não é "dias
  trabalhados", é diferença de calendário.
- Se a data de início mudar, **todos os números de RDO já emitidos mudam**. O
  número não é estável.

**Herdar:** a fórmula sim, porque o fiscal reconhece esse número. Mas o produto
deve decidir se o primeiro dia é 0 ou 1, e congelar o número no fechamento do dia
em vez de recalcular sempre. Ver `duvidas.md`, dúvida 12.

---

## 4. Produção acumulada por serviço controlado

**Fonte:** `PRODUÇÃO!D2:D5`, `01!K28:K34`, `01!O28:O34`, `01!X28:X34`.

Para cada um dos 4 serviços controlados, o RDO do dia mostra quatro números:

| Coluna     | Regra                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| `EXEC.`    | soma da produção lançada **naquele dia exato** para aquele serviço          |
| `ACUM.`    | soma da produção lançada **até aquele dia, inclusive**, para aquele serviço |
| `PROJETO`  | quantidade total prevista, vinda do cadastro                                |
| barra de % | acumulado dividido por projeto, protegido contra erro de divisão            |

Observações que importam:

- O acumulado é **sempre recalculado do zero** somando todos os lançamentos, nunca
  guardado. Corrigir um lançamento de março corrige o acumulado de setembro
  automaticamente. Essa propriedade deve ser preservada.
- A soma casa por **igualdade exata do nome do serviço** como texto. Um espaço a
  mais no nome zera o acumulado em silêncio.
- A divisão é protegida contra erro, mas **não há nenhum limite superior**: se o
  acumulado passar da quantidade de projeto, o percentual passa de 100% e a barra
  simplesmente estoura. Nada alerta.
- A quantidade de projeto vem de arquivo externo. Se o arquivo não estiver
  acessível, o valor em cache é usado sem aviso de que está velho.

**Herdar:** sim, as quatro colunas e o recálculo. Adicionar validação de acumulado
acima do projeto como aviso, não como bloqueio. Caso de teste obrigatório.

---

## 5. Resumo do dia da pluviometria

**Fonte:** `PLUVIOMETRIA!F3:F33`.

O dia recebe três letras, uma para cada turno: noite anterior, manhã e tarde.
Cada letra é `B` (bom), `C` (chuva) ou `I` (impraticável).
O resumo do dia é decidido nesta ordem, parando na primeira condição verdadeira:

1. Se as **três** letras forem `B` → **Trabalhado**.
2. Senão, se houver ao menos um `C` **e** o índice do dia for **menor que 10** →
   **Trabalhado**.
3. Senão, se houver ao menos um `C` **e** o índice do dia for **maior que 10** →
   **Perca de produção**.
4. Senão, se houver ao menos um `I` → **Impraticavél**.
5. Senão → **vazio**.

### 5.1. O buraco no índice exatamente 10

Os passos 2 e 3 testam menor que 10 e maior que 10. **O valor 10 não satisfaz
nenhum dos dois.** Um dia com chuva e exatamente 10 mm cai no passo 4; como não
há `I`, cai no passo 5 e o resumo fica **vazio**.

Isso não é hipótese: é o comportamento da fórmula. Um dia com chuva de 10 mm
desaparece das três contagens do painel lateral, e a soma
Trabalhado + Perca + Impraticável deixa de fechar com o número de dias do mês.

**Herdar:** não. O produto precisa decidir para que lado o 10 vai e testar o
valor de fronteira explicitamente. Caso de teste obrigatório.

### 5.2. Outros buracos da mesma árvore

- Um dia com `B`, `B`, `I` e índice 0: não tem três `B`, não tem `C`, tem `I` →
  **Impraticavél**. Correto.
- Um dia com `B`, `B`, vazio: não tem três `B`, não tem `C`, não tem `I` →
  **vazio**. Dias de domingo em que ninguém preencheu ficam assim, e o arquivo
  real tem vários.
- Um dia com `C` e índice exatamente 0 → passo 2 → **Trabalhado**. Chuva sem
  chuva medida.
- A macro VBA pinta uma quarta letra, `N`, que a árvore de decisão não conhece.
  Se alguém digitar `N`, o resumo fica vazio.

### 5.3. Índice acumulado

O primeiro dia do mês repete o índice; cada dia seguinte soma o próprio índice ao
acumulado do dia anterior. O acumulado **zera a cada mês** e não tem acumulado de
obra. O painel lateral conta ocorrências de cada resumo no mês.

A contagem do painel compara com o texto `Perca de Produção`, com P maiúsculo,
enquanto a fórmula produz `Perca de produção`, com p minúsculo. No Excel isso
funciona porque a comparação ignora maiúsculas; **em qualquer linguagem de
programação normal, não funciona.** Caso de teste obrigatório na migração.

---

## 6. Encadeamento de datas entre as abas de dia

**Fonte:** `01!AL1` e `02!AL1` a `31!AL1`.

- A aba `01` tem a data digitada, literal: 01/09/2026.
- Cada aba seguinte é **a data da aba anterior mais um dia**, em cadeia.
- A aba `31` resolve para 01/10/2026, porque setembro tem 30 dias. O RDO do dia
  31 existe, imprime e mostra dados de outro mês.

Efeitos colaterais desse desenho:

- Mudar a data da aba `01` desloca as 30 abas seguintes de uma vez. É a única
  coisa boa do arranjo.
- Não há relação nenhuma entre o número da aba e o dia do mês, além da
  coincidência. A aba `07` só é o dia 7 porque a aba `01` foi posta no dia 1.
- Nenhuma aba valida se a data pertence ao mês do arquivo.
- Um mês de 28 dias deixa 3 abas apontando para março, imprimíveis.
- A referência é escrita como intervalo e resolvida por interseção implícita,
  construção frágil que quebra em versões antigas do Excel.

**Herdar:** não. No produto novo o dia é uma entidade com data própria, validada
contra o mês de referência. Casos de teste obrigatórios: mês de 30 dias e mês de
28 dias.

---

## 7. Composição do RDO diário a partir das mestras

**Fonte:** abas `01` a `31`, blocos indicados.

Tudo que aparece no RDO do dia é buscado pela **data do dia** nas abas mestras:

| Bloco                       | De onde vem    | Como casa                             |
| --------------------------- | -------------- | ------------------------------------- |
| Efetivo pessoal             | `PESSOAL`      | intervalo entrada/saída contra a data |
| Efetivo equipamento         | `EQUIPAMENTO`  | intervalo entrada/saída contra a data |
| Produção do dia e acumulada | `tb_produção`  | data igual, e data menor ou igual     |
| Atividades e status         | `ATIVIDADES`   | data igual, pega a n-ésima ocorrência |
| Pluviometria                | `PLUVIOMETRIA` | procura a data na tabela do mês       |
| Comentários                 | `OBSERVAÇÕES`  | data igual, pega a n-ésima ocorrência |

Limites embutidos no layout, que o produto novo herda como limites de página:

- **15 atividades por dia.** A partir da décima sexta, a atividade não aparece no
  RDO. O arquivo real chega a 11 atividades num dia, então o limite ainda não
  estourou, mas está perto.
- **4 linhas de comentário** em 30 das 31 abas e 7 linhas na aba `05`. Como o
  texto real é quebrado em várias linhas com a mesma data, um comentário de 5
  linhas é truncado silenciosamente.
- **41 colunas de função** e 41 de equipamento.
- **4 serviços controlados**, posições fixas, uma por linha.

Todas as buscas usam correspondência exata de data e são recalculadas na abertura.
Nenhum resultado é gravado.

**Herdar:** o princípio de que o RDO é sempre calculado, nunca armazenado pronto,
é a regra central do produto. Os limites de 15 e de 4 são limites de layout do PDF
e precisam de tratamento explícito de transbordo.

---

## 8. Origem do bloco de comentários (defeito grave)

**Fonte:** `01!F53:F56`, comparado com o rótulo em `01!F52`.

O bloco rotulado **COMENTÁRIOS CROS**, que é a contratada, lê a aba
**OBSERVAÇÕES CONTRATANTE**, que é a Prefeitura.
A aba `OBSERVAÇÕES CONTRATADA`, onde estão os 15 comentários realmente escritos
pela CROS, **não é lida por nenhuma fórmula em nenhuma das 32 abas de RDO**.

O rótulo `COMENTÁRIO CONTRATANTE`, em `F57`, é texto solto: não tem fórmula
nenhuma embaixo.

Resultado prático: **o RDO diário nunca mostra comentário nenhum**, porque a aba
que ele lê está vazia, e os comentários que existem nunca são impressos.

**Herdar:** não. É a inversão de duas fontes. No produto novo cada bloco lê a sua
própria origem, e isso é um caso de teste de fidelidade do documento.

---

## 9. Taxonomias fixas

**Fonte:** `DADOS!G3:G16` e `DADOS!I3:I8`, ligadas por validação de dados a
`ATIVIDADES!J5:J511` e `ATIVIDADES!D5:D511`.

### Status de atividade — 14 termos

`Produção`, `Informativo`, `Pendências - Cliente`, `Pendências - CROS`,
`Mobilização`, `Desmobilização`, `Alterações - Cliente`, `Fornecimento`,
`Removido/Alteração`, `Serviço Fo. Es.`, `Paralisação`, `Transporte`, `Limpeza`,
`Levantamento`.

Apenas 8 foram usados em 504 linhas. Seis nunca apareceram:
`Pendências - Cliente`, `Pendências - CROS`, `Alterações - Cliente`,
`Fornecimento`, `Removido/Alteração`, `Paralisação`.

A validação aponta para um intervalo com **duas linhas vazias de reserva**
(`G17:G18`), o que significa que alguém pode acrescentar um termo a qualquer
momento sem avisar.

### Condição de tempo — 6 termos

`Bom`, `Nublado`, `Chuvoso`, `Chuva Parcial`, `Impraticável`, `---`.
O termo `---` nunca foi usado; serve como "não informado".

### Turno de pluviometria — 3 letras

`B` bom, `C` chuva, `I` impraticável. A macro VBA conhece uma quarta, `N`,
provavelmente "nublado", que nenhuma outra parte da planilha aceita.

### Resumo do dia — 3 termos

`Trabalhado`, `Perca de produção`, `Impraticavél`, mais o vazio do buraco descrito
em 5.1. Note as grafias: `Perca` no lugar de `Perda`, e `Impraticavél` com acento
no lugar errado. **São as grafias que o fiscal está acostumado a ver.**

### Status do mapa linear — 4 códigos e meio

`1` Base Concluida, `2` Liberado, `3` Em Execução, `4` Concluído, mais
`Pendências` sem código na legenda e um código `5` que só existe na formatação
condicional.

### Serviços controlados — 4

`REC.(FRESA+CAPA)`, `REC.(FRESA+BINDER+CAPA)`, `RECICLAGEM(BASE+CAPA)`,
`IM.(SUBLEITO+BASE+CAPA)`.

**Herdar:** todas as listas, com as grafias exatas, inclusive os erros de
ortografia, porque são o vocabulário do cliente. Mas como **tabela de domínio
editável**, não como constante no código, já que a planilha prova que a lista
cresce.

---

## 10. Períodos de BMS

**Fonte:** `DADOS!B3:E42`.

> Quantidade de dias do período = data final menos data inicial mais um.

O ciclo original é de 16 de um mês a 15 do seguinte, 40 períodos de 16/12/2022 a
15/12/2025. As quatro primeiras linhas foram sobrescritas com datas de 2024 e uma
delas ficou com período negativo, ver `inconsistencias.md`.

O BMS que aparece no RDO de setembro de 2026 é o número 7, digitado à mão em cada
aba, e **não corresponde a nenhuma linha desta tabela**. O título dentro da aba
ATIVIDADES fala em "BMS 001 - 05/02/2025 a 28/02/2026" e o das observações em
"BMS 001 - 05/02/2026 a 28/02/2026", ou seja, um período de 24 dias que também não
segue o ciclo 16 a 15.

**Herdar:** a fórmula de contagem de dias sim, com validação de que a data final
não é anterior à inicial. O ciclo, não: precisa ser cadastrado por obra.
Ver `duvidas.md`, dúvida 2.

---

## 11. Dia sem atividade

**Fonte:** `ATIVIDADES!C` (56 linhas "Não houve atividades" e variações).

A planilha **não tem estado de dia parado**. Um dia sem trabalho vira uma linha de
atividade cujo texto é a explicação: "Não houve atividades", "Não houve atividades

- Domingo.", "Não houve atividades - Feriado", "Não houve atividades devido o
  excesso de umidade no trecho."

O status dessas linhas é `Produção` em 79 casos, o que é contraditório: um dia
parado marcado como produção. Não há como filtrar dias parados sem interpretar
texto livre.

**Herdar:** não. O dia precisa ter um estado próprio, separado da lista de
atividades. Caso de teste obrigatório: dia sem atividade nenhuma.

**Decidido em 16/09/2026** (`docs/prd/v1.md`, decisões 4.1, 4.2 e 20.1): três
estados, `não lançado`, `parado` e `trabalhado`. O motivo da parada é **texto
livre obrigatório**, com oito sugestões tocáveis, e não taxonomia fechada como
esta análise supunha. A escolha é consciente e o risco está registrado em
`duvidas.md`, dúvida 3: texto livre é o que trouxe as 13 grafias descritas acima,
e as sugestões existem para conter a dispersão sem travar o lançamento em campo.

---

## 12. Regras que a planilha não tem e o produto vai precisar

Listadas aqui porque a ausência também é achado:

- Não há regra de fechamento do dia. Qualquer célula pode ser alterada a qualquer
  momento, inclusive de meses anteriores, sem rastro.
- Não há autoria: não se sabe quem lançou o quê nem quando.
- Não há validação cruzada entre produção lançada e atividade do dia. O dia
  27/03/2026 tem produção de 2.992 e nenhuma atividade.
- Não há fuso horário. As datas são valores de dia puros, sem hora, exceto pelos
  formatos de célula errados.
- Não há controle de acesso. Quem abre o arquivo edita tudo.
- Não há limite superior para produção acumulada contra a quantidade de projeto.
- Não há regra para pessoa que sai e volta. O cálculo por intervalo único
  quebraria: uma pessoa com duas passagens pela obra precisaria de duas linhas, e
  a contagem somaria as duas como se fossem duas pessoas.
- O mesmo vale para equipamento que sai e volta, e esse caso é real: a nota solta
  em `EQUIPAMENTO!M2` cita equipamentos que não estão na tabela, sugerindo
  entradas e saídas não registradas.
