# Inconsistências e dados sujos na planilha de referência

Cada item tem aba, célula, o que está errado e por que é suspeito.

A marca **[CASO DE TESTE]** indica que a situação vira caso de teste obrigatório
do produto novo. O produto não vai ler esta planilha, mas precisa **não repetir**
estes defeitos e precisa **aceitar** os dados reais que existem por causa deles.
A lista consolidada está em `.claude/agents/qa-casos-teste.md`.

---

## A. Erros de fórmula visíveis na tela

### A1. `#NAME?` nas colunas auxiliares de função e equipamento

`PESSOAL!I2:I20`, `EQUIPAMENTO!H2:H13`, `00!B14`, `00!B20`.

As fórmulas usam a função `UNIQUE`, gravada com o prefixo de função futura, sinal
de que o arquivo foi salvo por uma versão do Excel que não a conhece. Resultado:
`#NAME?` em 33 células.

Por que é suspeito: as abas `01` a `31` contornaram o problema lendo colunas
diferentes, mas a aba `00` não, e exibe o erro. Uma lista de funções quebrada
significa um bloco inteiro do RDO em branco.

### A2. Nome definido apontando para referência destruída

`DATAHOJE` = `#REF!`, no nível da pasta de trabalho.

Um nome global que não aponta para lugar nenhum. Qualquer fórmula que o use
retorna erro. Hoje ninguém usa, mas o nome continua exportado nos metadados.

### A3. Validação de dados e formatação condicional apontando para `#REF!`

`ATIVIDADES!J2:J4`, `J512:J848`, `J850:J1048576`, `D2:D4`, `D512:D1048576`.

Dentro da faixa de dados, linhas 5 a 511, a validação é boa e aponta para
`DADOS`. **Fora dela, aponta para uma referência destruída.** Ou seja: a linha 512
em diante não tem validação nenhuma. Quem continuar o log a partir dali digita
status livre, sem lista.

**[CASO DE TESTE]** o produto valida status contra a tabela de domínio sempre, não
por faixa de linhas.

### A4. Macro lendo célula vazia e objetos inexistentes

`PLUVIOMETRIA!S2` vazia, lida pela macro `atl_dgv`; gráficos `PLUV` e `Gráfico 7`
não existem; índice de tabela dinâmica menos um é inválido.

Tudo isso dentro de um supressor de erro, então **falha em silêncio a cada
alteração da aba**. O usuário acha que atualizou o gráfico e não atualizou.

### A5. Formatação condicional comparando número com letra

`PLUVIOMETRIA!G3:G33` tem regras que comparam o índice em mm com os textos
`"B"`, `"C"` e `"I"`. Nunca disparam. É o resultado de copiar a formatação das
colunas de turno para a coluna numérica.

---

## B. Valores impossíveis

### B1. Período de BMS com fim anterior ao início

`DADOS!C6` = 01/12/2024, `DADOS!D6` = 15/12/2022, `DADOS!E6` = **-716 dias**.

O início é fórmula, herdado da linha de cima; o fim é literal, sobrevivente do
preenchimento antigo. A célula mostra um número negativo de dias e ninguém viu.

**[CASO DE TESTE]** período com data final anterior à inicial deve ser rejeitado
no cadastro, com mensagem clara.

### B2. A tabela de BMS não cobre o período da obra

`DADOS!B3:D42` vai de 2022 a 2025. A obra começou em 05/02/2026 e as abas de RDO
dizem BMS 7. **Nenhuma linha da tabela contém setembro de 2026.**

Por que é suspeito: ou a tabela é lixo herdado de outra obra, ou o número 7
digitado nas abas é arbitrário. Nos dois casos, o BMS impresso no RDO não é
rastreável. Ver `duvidas.md`, dúvida 2.

### B3. A aba `31` cai em outubro

`31!AL1` resolve para 01/10/2026. Setembro tem 30 dias.

A aba existe, tem área de impressão definida e imprime um RDO datado de outro mês,
com o número de RDO 238 e todos os blocos preenchidos com dados de outubro.

**[CASO DE TESTE]** mês de 30 dias e mês de 28 dias: o produto não pode gerar dia
inexistente.

### B4. Ano errado no título de seção

`ATIVIDADES!C3` = `BMS 001 - 05/02/2025 a 28/02/2026`.

O mesmo BMS aparece como `05/02/2026 a 28/02/2026` em
`OBSERVAÇÕES CONTRATADA!C1` e `OBSERVAÇÕES CONTRATANTE!C1`. A obra começou em
2026, então o `2025` está errado. Um título com um ano de diferença, digitado à
mão, no meio da área de dados.

### B5. Mês da pluviometria diferente do mês do arquivo

`PLUVIOMETRIA!A3` e `T2` = julho de 2026. O arquivo é o RDO de **setembro** de
2026 e as abas `01` a `31` cobrem 01/09 a 01/10/2026.

Consequência direta: a busca da pluviometria na aba do dia não encontra a data e
os quatro campos de tempo do RDO saem **vazios em todos os 31 dias**. Confirmado
nos valores em cache.

**[CASO DE TESTE]** mês do cabeçalho diferente do mês do período consultado.

### B6. Pivô travado em dezembro

`DGV!B1` = `dez`, com datas como texto `01/dez` a `31/dez` e um total geral de 500
que é a soma de uma coluna já acumulada.

A aba está oculta, alimenta um gráfico, e mostra dezembro num arquivo de setembro.

---

## C. Cabeçalho que não bate com o conteúdo

### C1. `HORAS` sobre uma lista de status

`DADOS!G2` = `HORAS`; `G3:G16` = os 14 status de atividade.

Quem abre a aba para procurar horas trabalhadas encontra status. Quem procura a
lista de status não a encontra pelo nome.

### C2. `Coluna1` como nome de coluna de tabela

`PESSOAL!C1`. Nome automático do Excel para coluna sem título. O conteúdo é a
lista de funções distintas.

### C3. `ACTIVITIES` em inglês

`ATIVIDADES!C1`, numa planilha inteiramente em português. Tem um comentário de
célula do autor original explicando: "Evento ou efeito ou reação".

### C4. Coluna de tempo com formato de hora

`ATIVIDADES!D5:D509` tem formato de número de hora e minuto aplicado a texto
(`Bom`, `Chuvoso`). Se alguém digitar um número nessa coluna, ele vira hora.

### C5. Coluna sem cabeçalho no meio da tabela

`ATIVIDADES!E` calcula o número do dia da semana e não tem título. Está entre duas
colunas que têm.

### C6. `DIA DA SEMANA` com cabeçalho e sem conteúdo

`OBSERVAÇÕES CONTRATADA!B` e `OBSERVAÇÕES CONTRATANTE!B`, 236 linhas, todas
vazias, coluna declarada nas duas tabelas.

### C7. Grafias erradas que viraram vocabulário

`PLUVIOMETRIA!H2` = `INDICE ACUMUALDO` em vez de ACUMULADO.
O resumo do dia produz `Perca de produção` em vez de "Perda", e `Impraticavél` com
o acento na vogal errada.
`LINEAR!D19` = `Base Concluida` sem acento.

Por que importa: são os rótulos que o fiscal lê e reconhece. Corrigir a ortografia
é uma decisão de produto, não uma limpeza óbvia.

### C8. Contraste de grafia entre fórmula e contagem

`PLUVIOMETRIA!T7` = `Perca de Produção`, com P maiúsculo, contra `Perca de
produção`, minúsculo, produzido pela fórmula da coluna F.
No Excel a contagem ignora maiúsculas e funciona. Em código, não funciona.

**[CASO DE TESTE]** comparação de termo de taxonomia é insensível a caixa e a
espaços nas pontas.

### C9. Número de contrato divergente entre abas

`00!G7` = `190/2026`. `01!G7` a `31!G7` = `P0476/01-25 - BLOCO 02`.
O nome do arquivo cita `190 PMMC - BLOCO 02`.

Três identificações diferentes para a mesma obra no mesmo arquivo.
Ver `duvidas.md`, dúvida 1.

### C10. Bloco de comentário lendo a fonte errada

`01!F52` rotula `COMENTÁRIOS CROS` mas `F53:F56` lê a aba
`OBSERVAÇÕES CONTRATANTE`. Detalhado em `regras-extraidas.md`, seção 8.

**[CASO DE TESTE]** cada bloco do documento lê a sua própria fonte; teste de
fidelidade compara rótulo e origem.

### C11. Rótulo sem fórmula embaixo

`01!F57` = `COMENTÁRIO CONTRATANTE`, e nenhuma célula abaixo dele tem fórmula.
O bloco é decorativo.

---

## D. Datas em formatos e tipos diferentes

### D1. Três formatos de data no mesmo arquivo

- `mm-dd-yy`: `DADOS!C:D`, `PESSOAL!D:E`, `EQUIPAMENTO!C:D`, `PLUVIOMETRIA!A`,
  `01!AL1`, `00!Q7:Q8`.
- `dd/mm/yy;@`: `ATIVIDADES!A`, `PRODUÇÃO!A`, `OBSERVAÇÕES!A`.
- Texto puro: `DGV!A4:A34`, no formato `01/dez`.

O formato americano em metade das abas de uma planilha brasileira é convite a erro
de leitura: 03/09 e 09/03 trocam de significado conforme a aba.

**[CASO DE TESTE]** data exibida sempre no formato brasileiro, e data armazenada
sempre como dia puro com fuso definido.

### D2. Período de BMS gravado como texto dentro de um título

`ATIVIDADES!C3` e `OBSERVAÇÕES!C1` guardam o período do BMS dentro de uma frase.
Não é campo, é texto. Não dá para filtrar, somar nem validar.

### D3. Dia com produção e sem atividade

27/03/2026 tem lançamento de 2.992 em `tb_produção` (`PRODUÇÃO!A14:C14`) e
**nenhuma linha em `ATIVIDADES`**. É o único dia ausente entre 05/02 e 12/09.

**[CASO DE TESTE]** dia com produção lançada e nenhuma atividade.

### D4. Dois dias faltando nas observações

28/05/2026 e 29/05/2026 não existem em nenhuma das duas abas de observações,
que fora isso têm uma linha por dia corrido.

### D5. Períodos de cobertura diferentes entre as mestras

- `ATIVIDADES`: 05/02/2026 a 12/09/2026.
- `OBSERVAÇÕES`: 05/02/2026 a 29/08/2026.
- `PLUVIOMETRIA`: julho de 2026.
- `tb_produção`: 09/03/2026 a 03/09/2026.
- abas de RDO: 01/09/2026 a 01/10/2026.

Cinco janelas diferentes no arquivo que se chama "RDO SETEMBRO 2026". Em 12 dos
31 dias de setembro o RDO sai com blocos vazios sem que nada indique o motivo.

---

## E. Linhas e células sujas

### E1. Linha órfã sem data

`ATIVIDADES!509` tem tempo `Bom`, dia da semana 7 e status `Produção`, sem data e
sem descrição. É a linha seguinte ao último dado real.

**[CASO DE TESTE]** registro sem data é rejeitado, não ignorado em silêncio.

### E2. Três atividades sem status

`ATIVIDADES!J187`, `J188`, `J207`. As três são de dias sem trabalho
(11, 12 e 19 de abril de 2026), duas delas domingo.

**[CASO DE TESTE]** atividade sem status.

### E3. 79 linhas com texto de dia parado e status `Produção`

`ATIVIDADES`, linhas com texto começando em "Não houve", status `Produção`.
Um dia parado classificado como produção. Ver `regras-extraidas.md`, seção 11.

### E4. Duas fórmulas diferentes para o dia da semana

`ATIVIDADES!B`: 452 linhas com uma construção e 52 linhas com outra. Produzem o
mesmo texto hoje, mas dependem de coisas diferentes: uma da coluna auxiliar `E`,
outra da data direto. Se a coluna `E` for apagada, 452 linhas quebram e 52 não.

### E5. Espaço no fim de nomes e funções

Funções com espaço final: `Servente `, `Motorista `, `Op. Retro `.
Nomes com espaço final: 6 dos 19.
Tipo de equipamento com espaço final: `CARREGADEIRA `.

A lista de funções distintas gerada por fórmula **preserva o espaço**, então o
rótulo impresso no RDO sai com espaço e a contagem casa por acaso. Trocar a
ordem de digitação quebraria.

**[CASO DE TESTE]** nome e função são normalizados nas pontas antes de comparar.

### E6. Identificador de equipamento que é descrição

`EQUIPAMENTO!B7` = `CARRO LOC.`, no lugar de um código como `CF-29`. É um carro
alugado sem placa cadastrada.

### E7. Nota solta fora de tabela citando equipamento inexistente

`EQUIPAMENTO!M2` lista 12 identificadores, dois dos quais, `CB-40` e `TP-41`, não
estão na tabela, e marca `MT-25(Reserva)`. Texto livre fora de qualquer estrutura,
que provavelmente registra o efetivo real de um dia específico.

**[CASO DE TESTE]** equipamento com saída e nova entrada depois: o cadastro
precisa suportar mais de uma passagem pela obra.

### E8. Texto de observação quebrado em linhas que repetem a data

`OBSERVAÇÕES CONTRATADA`, por exemplo linhas 10 a 12, todas 10/02/2026, formando
um parágrafo só. A quebra é visual, feita para caber na largura da coluna.

Qualquer contagem por linha conta um comentário como três.

### E9. Bloco deslocado em uma única aba

Aba `05`: comentários em `F53:F59` e rótulo em `F60`, contra `F53:F56` e `F57` nas
outras 30. Diferença invisível na tela, fatal para um extrator posicional.

### E10. Célula vazia no meio da faixa de rótulos

`01!S14` a `31!S14` vazias, enquanto `00!S14` tem fórmula. Um buraco no meio das
41 colunas de função.

---

## F. Colunas, linhas e faixas de reserva

Estas são a razão da regra dura de nunca identificar coluna por posição.

| Onde                             | Reserva                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `ATIVIDADES!F:I`                 | 4 colunas ocultas, totalmente vazias, entre colunas em uso                               |
| `ATIVIDADES`                     | dados até a linha 509, dimensão declarada até a 1115, fórmulas referenciando até a 10246 |
| `OBSERVAÇÕES` (as duas)          | dimensão declarada até a coluna XFD e a linha 535                                        |
| `tb_produção`                    | 58 linhas de capacidade, 15 usadas                                                       |
| `rdo_pessoal`                    | 39 linhas de capacidade, 19 usadas                                                       |
| `rdo_equip`                      | 21 linhas de capacidade, 14 usadas                                                       |
| `DADOS!G17:G18`                  | 2 linhas vazias dentro do intervalo de validação de status                               |
| `DADOS!J:M`                      | 4 colunas vazias                                                                         |
| abas de RDO                      | 41 colunas de função e 41 de equipamento; 12 e 14 usadas                                 |
| abas de RDO                      | 15 linhas de atividade; máximo real observado 11                                         |
| `PESSOAL!I:K`, `EQUIPAMENTO!H:I` | colunas auxiliares fora da tabela, sem cabeçalho                                         |

Uma coluna de reserva preenchida muda o significado de tudo que vem depois dela
num extrator posicional. Como o produto novo **escreve** a planilha em vez de
lê-la, o risco muda de lado, mas continua existindo na hora de conferir o
resultado contra o modelo.

---

## G. Fragilidades estruturais

### G1. Dependência de arquivo em servidor de arquivos

As 4 quantidades de projeto em `PRODUÇÃO!C2:C5` vêm de um `.xlsx` em
`\\<servidor-interno>`. Fora da rede da empresa, o valor em cache é usado **sem nenhum
aviso de que pode estar desatualizado**.

### G2. Link para o RDO de outra obra e de outro cliente

Referência externa a `186. TURANO - PAVIMENTAÇÃO EUROFARMA\...\MARÇO- 2025.xlsm`.
Não é usada por fórmula nenhuma. Vaza o nome de um contrato de terceiro para
quem abrir o arquivo.

### G3. Dependência de suplemento local

Referência a `samradapps_datepicker.xlam` instalado no Office da máquina. Em
outro computador, gera aviso de link quebrado na abertura.

### G4. Peso de recálculo

Cadeia de cálculo de 244 KB, estilos de 85 KB, 42 abas, mais de 5.600 fórmulas,
sendo muitas matriciais que varrem faixas de 10 mil linhas para achar 1 a 11
resultados. Abrir e recalcular o arquivo é lento por construção.

### G5. Editável por quem abrir

Nenhuma aba tem proteção. Não há autoria, nem histórico, nem fechamento. Qualquer
pessoa altera qualquer dia, inclusive fechado e já entregue, sem deixar rastro.

**[CASO DE TESTE]** dois lançamentos do mesmo dia por pessoas diferentes; dia
fechado não aceita alteração.

---

## Índice dos casos de teste derivados daqui

| #   | Situação                                             | Origem                                                      |
| --- | ---------------------------------------------------- | ----------------------------------------------------------- |
| 1   | pessoa com saída no próprio dia consultado           | A divergência de menor-igual contra menor, regras seção 1.1 |
| 2   | pessoa com saída anterior à entrada                  | B1, por analogia com o período de BMS                       |
| 3   | índice pluviométrico exatamente 10                   | regras seção 5.1                                            |
| 4   | dia sem atividade nenhuma                            | regras seção 11, E2                                         |
| 5   | dia com produção e nenhuma atividade                 | D3                                                          |
| 6   | produção acumulada maior que a de projeto            | regras seção 4                                              |
| 7   | atividade sem status                                 | E2                                                          |
| 8   | equipamento com saída e nova entrada depois          | E7                                                          |
| 9   | obra com data final anterior à inicial               | B1                                                          |
| 10  | mês de 30 dias e mês de 28 dias                      | B3                                                          |
| 11  | dois lançamentos do mesmo dia por pessoas diferentes | G5                                                          |
| 12  | mês do cabeçalho diferente do mês consultado         | B5                                                          |
| 13  | termo de taxonomia com caixa e espaço divergentes    | C8, E5                                                      |
| 14  | registro sem data                                    | E1                                                          |
| 15  | data exibida em formato brasileiro, fuso definido    | D1                                                          |
