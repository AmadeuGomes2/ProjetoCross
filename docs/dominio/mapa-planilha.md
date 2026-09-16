# Mapa da planilha de referência (RDO)

Arquivo analisado: `8 - RDO SETEMBRO 2026 - 190 PMMC - BLOCO 02 .xlsm`
SHA-256 da cópia lida: `CD3C784EC78E77261E0D4E7E1B0F80E9EA87077F84178E3B7CD5291371E87C32`
Tamanho: 812.050 bytes · 42 abas · descompactado 5.102.398 bytes (razão 6,3x)
Criado em 2020-10-06, modificado em 2026-09-09, impresso pela última vez em 2026-09-09.

> Este documento descreve a planilha **legada**, que é a especificação da SAÍDA do
> produto novo, não a sua entrada. Ver `docs/spec.md`, seção Inversão central.

---

## 1. Classificação: mestras vs derivadas

### Abas MESTRAS (o dado nasce aqui, digitado por pessoa)

| Aba                       | Objeto/tabela                 | O que guarda                                    |
| ------------------------- | ----------------------------- | ----------------------------------------------- |
| `ATIVIDADES`              | intervalo livre `A1:J1115`    | log de atividades, N por dia                    |
| `PESSOAL`                 | tabela `rdo_pessoal` `A1:E40` | pessoa, função, entrada, saída                  |
| `EQUIPAMENTO`             | tabela `rdo_equip` `A1:D22`   | equipamento, tipo, entrada, saída               |
| `PRODUÇÃO`                | tabela `tb_produção` `A7:C66` | produção diária por serviço controlado          |
| `PRODUÇÃO`                | intervalo `B1:E5`             | cadastro dos 4 serviços e quantidade de projeto |
| `PLUVIOMETRIA`            | tabela `Tabela2` `A2:H33`     | 3 turnos e índice em mm, por dia do mês         |
| `OBSERVAÇÕES CONTRATADA`  | tabela `Tabela57` `A3:C240`   | texto livre da contratada, por dia              |
| `OBSERVAÇÕES CONTRATANTE` | tabela `Tabela5` `A3:C240`    | texto livre do contratante, por dia (vazia)     |
| `DADOS`                   | intervalo `B2:I42`            | períodos de BMS e as duas taxonomias fixas      |
| `LINEAR`                  | intervalo `B2:BP23`           | status por estaca e por serviço                 |

### Abas DERIVADAS (nenhum dado próprio além da data; tudo é fórmula)

| Aba         | O que é                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `00`        | RDO modelo/protótipo, congelado em 05/02/2026                                |
| `01` a `31` | um RDO por dia do mês; só a data em `AL1` é própria                          |
| `DGV`       | tabela dinâmica sobre `Tabela2`, alimenta o gráfico da pluviometria (oculta) |

---

## 2. Aba por aba

### `LINEAR` — mapa linear de estacas (mestra)

Dimensão `B2:BP23`, 577 células preenchidas, 384 fórmulas, 3 mescladas, 1 formatação condicional.

- Linha 2: rótulo do trecho, esparso. `C2` = `ENTRADA`, `R2:T2` = `ROTATÓRIA`,
  `AE2:AJ2` = `APP`, `AT2:AV2` = `ROTATÓRIA`. As demais colunas não têm rótulo.
- Linha 3: `B3` = `ESTACAS`; `C3` = 0 literal e `D3:BE3` = célula anterior mais um,
  resultando nas estacas 0 a 54.
- Linhas 5 a 8: serviço `PE`, rótulo só em `B5`. A linha 5 tem valores literais;
  6, 7 e 8 são cópia por fórmula da linha 5. Ou seja, as 4 linhas são sempre iguais.
- Linha 10: serviço `CV`, uma única linha, valores literais.
- Linhas 12 a 15: serviço `PD`. A linha 12 é literal; 13, 14 e 15 copiam a 12.
- Legenda em `B18:D23`: `1` Base Concluida, `2` Liberado, `3` Em Execução,
  `4` Concluído, e `Pendências` em `D23` **sem código numérico**.
- A formatação condicional cobre `A5:AJ7`, `AL5:BH14`, `BP5:XFD14` e outras faixas,
  com regras para os valores **1, 2, 3, 4 e 5** — existe um código 5 formatado que
  a legenda não documenta.
- Não há coluna de data. O mapa é uma foto do momento, sem histórico.

### `DADOS` — períodos de BMS e listas fixas (mestra)

Dimensão `B2:M44`, 185 células, 45 fórmulas.

- `B2` = `BMS`, `C2` = `Período `, `E2` = `Qtde dias período`.
  Linhas 3 a 42 = BMS 1 a 40, com `C` = início, `D` = fim, `E` = fim menos início mais um.
  As linhas 3 a 6 foram sobrescritas com datas de 2024; da linha 7 em diante o ciclo
  é 16 de um mês a 15 do seguinte, de 16/12/2022 a 15/12/2025.
- `G2` = `HORAS`, mas `G3:G16` contém a **taxonomia de STATUS de atividade**
  (14 termos). `G17:G18` vazias, de reserva — a validação de dados aponta para
  `DADOS!$G$3:$G$18`.
- `I2` = `TEMPO`, `I3:I8` contém a **taxonomia de condição de tempo** (6 termos).
- Colunas `J` a `M` vazias.

### `PRODUÇÃO` — serviços controlados e produção diária (mestra)

Dimensão `A1:E22`, 68 células, 12 fórmulas, tabela `tb_produção`.

- Bloco de cadastro, linhas 1 a 5: `B` serviço, `C` quantidade de projeto,
  `D` quantidade atual, `E` percentual.
  `C2:C5` são links para uma pasta **externa**, célula `CADASTRO!$D$5`, `$D$9`,
  `$D$12` e `$D$19` daquele arquivo. Só o valor em cache está aqui.
  `D2:D5` somam a tabela `tb_produção` filtrando pelo nome do serviço.
  `E` divide a quantidade atual pela de projeto, formato percentual.
- Bloco de lançamento, cabeçalho na linha 7 (`DATA`, `SERVIÇO CONTROLADO`,
  `PRODUÇÃO`), tabela `tb_produção` = `A7:C66`, ou seja **58 linhas de capacidade
  com apenas 15 preenchidas**, linhas 8 a 22.
- `B8:B66` tem validação de lista apontando para `$B$2:$B$5`.
- Lançamentos existentes: 09/03 a 03/09/2026, alternando entre
  `REC.(FRESA+CAPA)`, 8 lançamentos somando 15.027,032, e
  `IM.(SUBLEITO+BASE+CAPA)`, 7 lançamentos somando 14.163,33.
  Os outros dois serviços nunca receberam produção.

### `ATIVIDADES` — log diário de atividades (mestra, a mais importante)

Dimensão `A1:J1115`, 3.030 células, 1.009 fórmulas.

- Cabeçalho na linha 1: `A` `Data`, `B` `DIA DA SEMANA`, `C` `ACTIVITIES`,
  `D` `TEMPO`, `J` `STATUS`. A coluna `E` calcula o dia da semana **sem cabeçalho**.
  As colunas `F` a `I` estão ocultas, largura 3,1, e totalmente vazias.
- Linha 2 vazia; linha 3 tem só `C3` = `BMS 001 - 05/02/2025 a 28/02/2026`,
  um título de seção no meio da área de dados; linha 4 vazia.
- Dados nas linhas 5 a 508: 504 linhas com data, 219 dias distintos,
  de 05/02/2026 a 12/09/2026. Um dia pode ter de 1 a 11 atividades.
- Linha 509 é órfã: tem `D509` = `Bom`, `E509` = 7, `J509` = `Produção`, sem data
  e sem descrição.
- `B` usa duas fórmulas diferentes para a mesma coisa: uma escolha condicional
  sobre o número do dia da semana em 452 linhas, e uma formatação de texto da data
  em 52 linhas.
- Validação de dados moderna: `J5:J511` aponta para `DADOS!$G$3:$G$18` e
  `D5:D511` para `DADOS!$I$3:$I$8`. Fora dessas faixas há validação legada
  apontando para `#REF!`.
- Nome definido `Data` = `ATIVIDADES!$A:$A`. Filtro salvo em `A1:J1`.
- Comentário de célula em `C1`, autor `Welton Teixeira Da Silva`:
  "Evento ou efeito ou reação".
- Distribuição de `TEMPO`: Bom 445, Chuva Parcial 31, Impraticável 20,
  Nublado 5, Chuvoso 4.
- Distribuição de `STATUS`: Produção 446, Informativo 41, Levantamento 4,
  Serviço Fo. Es. 3, Mobilização 2, Transporte 2, Limpeza 2, Desmobilização 2.
  Três linhas ficaram sem status.

### `PESSOAL` — cadastro de pessoas (mestra)

Tabela `rdo_pessoal` = `A1:E40`. 19 pessoas nas linhas 2 a 20.

- Colunas da tabela: `NOME`, `FUNÇÃO`, `Coluna1`, `ENTRADA`, `SAIDA`.
  `Coluna1` é o nome automático que o Excel dá a uma coluna sem título;
  o conteúdo real é uma lista de funções distintas montada por fórmula matricial.
- Colunas auxiliares fora da tabela:
  `I2` usa a função `UNIQUE` sobre a coluna de função, derramada em `I2:I20`,
  e resolve para `#NAME?`;
  `J` é uma cópia linha a linha da função, com repetições, preenchida até a
  linha 27;
  `K3` em diante é outra tentativa de deduplicação, com argumentos incompatíveis,
  resultando em vazio.
- Nenhuma das 19 pessoas tem data de saída. Entradas: 05/02 com 3 pessoas,
  10/02 com 10, 16/02 com 3, 18/02 com 1 e 20/02 com 2, todas de 2026.
- 12 funções distintas: Auxiliar eng., ADM, Feitor, Servente, Motorista, Pedreiro,
  Operador III, Operador II, Op. Rolo C., Enc. Geral, Op. Retro, Topografo.

### `EQUIPAMENTO` — cadastro de equipamentos (mestra)

Tabela `rdo_equip` = `A1:D22`. 14 equipamentos nas linhas 2 a 15.

- Colunas: `NOME`, que na prática é o **tipo** (APOIO, PATROL, RETRO, BASCULA,
  CARRO, ROLO, TRATOR, CARREGADEIRA), `EQUIPAMENTO`, que na prática é o
  **identificador** (CF-29, MT-26, RE-17 e assim por diante), `ENTRADA` e `SAIDA`.
- Duas saídas registradas: `MT-26` em 18/02/2026 e `TP-36` em 01/03/2026.
- Auxiliares: `H2` usa `UNIQUE` sobre o identificador e dá `#NAME?`, com cópias
  isoladas em `H11`, `H12` e `H13`; `I` é a cópia linha a linha do identificador,
  até a linha 20.
- `M2` é uma anotação solta em texto livre, fora de qualquer tabela, listando
  12 identificadores, incluindo `CB-40` e `TP-41`, que não existem na tabela,
  e marcando `MT-25(Reserva)`.

### `OBSERVAÇÕES CONTRATADA` — texto livre da CROS (mestra)

Tabela `Tabela57` = `A3:C240`. Dimensão declarada até a coluna `XFD` e a linha 535.

- Título em `C1` = `BMS 001 - 05/02/2026 a 28/02/2026`.
- Cabeçalho na linha 3: `Data`, `DIA DA SEMANA`, `ATIVIDADES`.
- Linhas 5 a 240: uma por dia, de 05/02/2026 a 29/08/2026, 236 linhas com data.
- A coluna `DIA DA SEMANA` está **100% vazia** apesar do cabeçalho.
- O texto longo é **quebrado manualmente em várias linhas consecutivas que repetem
  a mesma data**. Exemplo: linhas 10, 11 e 12 são todas 10/02/2026 e juntas formam
  um parágrafo só. Isso é formatação virando estrutura de dados.
- 15 dias têm observação; o resto tem só a data.
- Comentário de célula em `A4`, autor `Inforcell`: "lembrar".

### `OBSERVAÇÕES CONTRATANTE` — texto livre da Prefeitura (mestra)

Tabela `Tabela5` = `A3:C240`. Estrutura idêntica à anterior, mesmas datas,
mesmas lacunas de 28 e 29/05, mesmo comentário em `A4`.
**A coluna de texto está inteiramente vazia** — o contratante nunca escreveu nada.
Apesar disso, é desta aba que o RDO diário puxa o bloco "COMENTÁRIOS CROS".

### `DGV` — tabela dinâmica da pluviometria (derivada, oculta)

Aba com estado `hidden`. Dimensão `A1:C35`, sem nenhuma fórmula.

- `A1` = `Meses (DATA)`, `B1` = `dez` — o filtro do mês está travado em dezembro.
- Cabeçalho em `A3:C3`: `Rótulos de Linha`, `Soma de INDICE`,
  `Soma de INDICE ACUMUALDO`.
- `A4:A34` = `01/dez` a `31/dez`, gravados como **texto**, com formato de data.
- `B4` = 10, `B16` = 10, resto vazio; `C` acumula 10 e depois 20.
  `A35` = `Total Geral`, `B35` = 20, `C35` = 500, que é a soma de uma coluna já
  acumulada, um número sem significado.
- Tabela dinâmica `Tabela dinâmica4` em `A3:C35`, cache apontando para `Tabela2`,
  com campos calculados `Dias (DATA)` e `Meses (DATA)`.

### `00` — RDO modelo (derivada)

Dimensão `B1:AS67`, 276 células, 112 fórmulas, **200 intervalos mesclados**.
Área de impressão `B1:AQ67`. É o protótipo do qual `01` a `31` foram copiadas,
mas ficou desatualizado. Ver a seção 3 para o layout, que é o mesmo das demais.

Diferenças do `00` para as abas `01` a `31`:

- `AL1` = 05/02/2026 literal; `AL4`, o BMS, = 1 literal.
- `G7`, o contrato, = `190/2026`, enquanto `01` a `31` trazem
  `P0476/01-25 - BLOCO 02`.
- As linhas 14 e 20 leem `PESSOAL!$I$2:$I$45` e `EQUIPAMENTO!$H$2:$H$31`, que são
  exatamente as colunas com `#NAME?`. O `00` exibe `#NAME?` na tela.
- `S14` tem fórmula aqui e está vazia em `01` a `31`.
- 200 células mescladas contra 201 nas demais.

### `PLUVIOMETRIA` — controle pluviométrico do mês (mestra)

Dimensão `A1:Z34`, 214 células, 125 fórmulas. Tabela `Tabela2` = `A2:H33`.
Área de impressão `A1:H33`.

- `A1` monta o título por fórmula e resolve para
  `Controle pluviométrico - JULHO/2026`.
- Cabeçalho na linha 2: `DATA`, `D. DA SEMANA`, `NOITE ANTERIOR`, `MANHÃ`, `TARDE`,
  `RESUMO DO DIA`, `INDICE`, `INDICE ACUMUALDO`, esta última com grafia errada de
  ACUMULADO.
- `A3` = 01/07/2026 literal; `A4` em diante avança um dia e zera quando muda de mês.
  31 linhas de dados.
- `C`, `D` e `E` recebem a letra do turno: `B`, `C` ou `I`.
- `F` é a árvore de decisão do resumo, detalhada em `regras-extraidas.md`.
- `G` é o índice em mm, com formato que anexa o sufixo mm. Todos os 31 dias estão
  com 0.
- `H3` repete o índice; `H4` em diante soma o acumulado anterior com o índice do dia.
- Painel lateral: `T2` = 01/07/2026, `T3` = `MÊS`, `T4` e `U4` = `INICIAL` e
  `FINAL`, e o resumo do mês em `T6`/`U6` = `Trabalhado` com 14 dias,
  `T7`/`U7` = `Perca de Produção` com 0 e `T8`/`U8` = `Impraticavél` com 0,
  contando ocorrências na coluna `RESUMO DO DIA`.
- `S2` está **vazia**, mas a macro VBA lê essa célula para descobrir o mês.
- Formatação condicional em `C2:F1048576` e em `G3:G33` comparando com as letras
  `B`, `C` e `I`. Em `G`, que é numérica, as regras nunca disparam.
- Os gráficos desta aba se chamam `Gráfico 1` e `Gráfico 2`.

### `01` a `31` — RDO de cada dia (derivadas)

31 abas, `B1:AS67`, cerca de 275 células, 182 fórmulas e 201 mescladas cada.
Área de impressão `B1:AQ67`.

- São **idênticas entre si célula a célula**, exceto:
  - `AL1`: na aba `01` é 01/09/2026 literal; nas demais é a data da aba anterior
    mais um, escrita como referência a um intervalo e resolvida por interseção
    implícita.
  - A aba `05` tem o bloco de comentários deslocado: as fórmulas ocupam
    `F53:F59` e o rótulo `COMENTÁRIO CONTRATANTE` cai em `F60`, enquanto nas
    outras 30 abas as fórmulas ocupam `F53:F56` e o rótulo fica em `F57`.
- `AL4`, o BMS, = 7, literal, igual em todas as 31 abas.
- A aba `31` resolve para **01/10/2026**, porque setembro tem 30 dias.

---

## 3. Layout do RDO diário (abas `00` e `01` a `31`)

Ordem dos blocos, com as células âncora. Este é o layout que o PDF do produto
novo precisa reproduzir. Ver `.claude/skills/fidelidade-documento/SKILL.md`.

| Bloco                      | Células                                                   | Conteúdo                                                             |
| -------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Título                     | `B1`                                                      | `RELATÓRIO DIÁRIO DE OBRAS`                                          |
| Data do RDO                | `AL1`, `AL2`                                              | data e dia da semana por extenso                                     |
| BMS                        | `AL3`, `AL4`                                              | rótulo e número do BMS                                               |
| Nº do RDO                  | `AO3`, `AO4`                                              | rótulo e a data do RDO menos a data de início                        |
| Informações gerais         | `B6` a `G11`                                              | CONTRATO, DATA INICIO, DATA FINAL, CONTRATANTE, CONTRATADA, ESCOPO   |
| Características do projeto | `Y6` a `AB10`                                             | NOME, ÁREA, LOCAL                                                    |
| Efetivo pessoal            | `B13`, linha 14, linha 17, `AQ17`                         | função nas colunas, quantidade abaixo, total                         |
| Efetivo equipamentos       | `B19`, linha 20, linha 23, `AQ23`                         | identificador nas colunas, quantidade abaixo, total                  |
| Produção controlada        | `B25`, `C26`/`K26`/`O26`/`S26`, linhas 28/30/32/34        | SERVIÇO, EXEC., ACUM., PROJETO e a barra de percentual na coluna `X` |
| Atividades do dia          | `B36`, `AN36`, linhas 37 a 51                             | descrição e status, 15 posições                                      |
| Pluviometria               | `B52`, `B54`/`D54`, `B56`/`D56`, `B58`/`D58`, `B60`/`B61` | NOITE ANTER, MANHÃ, TARDE, INDICE                                    |
| Comentários                | `F52`, `F53:F56`, `F57`                                   | COMENTÁRIOS CROS e COMENTÁRIO CONTRATANTE                            |
| Assinaturas                | `I63`, `I64`, `I65`, `D66`, `AD66`                        | nome, título e CREA do engenheiro; representantes                    |

Valores fixos do cabeçalho, como estão na aba `01`:

- CONTRATO `P0476/01-25 - BLOCO 02`
- DATA INICIO 05/02/2026 · DATA FINAL 05/02/2027
- CONTRATANTE `PREFEITURA MUNICIPAL DE MONTES CLAROS - MG`
- CONTRATADA `CROS CONSTRUÇÕES S.A.`
- ESCOPO `EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO`
- NOME `SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02`
- ÁREA `MONTES CLAROS - MG `
- LOCAL `VIAS URBANAS  DA CIDADE MONTES CLAROS - MG`
- Assinatura: `Victor Rebello Byrro `, `Engenheiro Civil `, `CREA - MG 212333/D`

Os espaços sobrando no fim desses textos estão no arquivo original e são
reproduzidos aqui de propósito.

---

## 4. Macros VBA

`xl/vbaProject.bin`, 78.848 bytes. Um módulo com código real, chamado `Módulo1`,
e classes de folha vazias.

- `DefinirCoresPorCategoria`: pinta os pontos do gráfico `PLUV` da aba
  PLUVIOMETRIA conforme a categoria — `I` vermelho, `B` amarelo, `C` azul,
  `N` cinza, qualquer outro cinza claro. **Trata uma quarta letra, `N`, que não
  aparece em nenhuma taxonomia da planilha.** O gráfico `PLUV` não existe, os
  gráficos da aba se chamam `Gráfico 1` e `Gráfico 2`, então a macro cai na
  mensagem de erro.
- `atl_dgv`: atualiza o cache da tabela dinâmica `Tabela dinâmica4` na aba DGV,
  lê o mês da célula `S2` da PLUVIOMETRIA, que está vazia, e tenta acessar uma
  tabela dinâmica pelo índice menos um, que é inválido. Também ativa
  `ChartObjects("Gráfico 7")`, que não existe.
- A aba PLUVIOMETRIA tem um manipulador de mudança de célula que chama as duas
  macros dentro de um supressor de erro, então todas as falhas acima ficam
  silenciosas.

Nenhuma macro faz acesso a arquivo, rede, shell ou registro. Do ponto de vista de
segurança este VBA é inofensivo; do ponto de vista funcional está quebrado.
**O produto novo ignora o VBA por completo.**

---

## 5. Ligações externas

> O endereço do servidor de arquivos foi **redigido** deste documento em
> 16/09/2026 e aparece como `<servidor-interno>`. O achado continua sendo o
> mesmo: a planilha depende de um caminho de rede interno da empresa. O octeto
> não acrescenta nada à análise e é topologia de rede num repositório, o que o
> `CLAUDE.md`, seção Segurança, proíbe.

Três referências a pastas externas, todas em servidor de arquivos interno:

1. `Mapa Controle - PMMC_BLOCO 02.rev00.xlsx`, em
   `\\<servidor-interno>\Engenharia\01. OBRAS\190. PMMC - BLOCO 02\04. Planejamento\02. Plano de Trabalho\`.
   É a única viva: as 4 quantidades de projeto em `PRODUÇÃO!C2:C5` vêm dela.
2. `samradapps_datepicker.xlam`, um suplemento de calendário instalado no Office
   da máquina. Não é usada por nenhuma fórmula.
3. `MARÇO- 2025.xlsm`, em
   `\\<servidor-interno>\Engenharia\01. OBRAS\186. TURANO - PAVIMENTAÇÃO EUROFARMA\04. Planejamento\05. RDO - Relatorio de Obra\`.
   **É o RDO de outra obra, de outro cliente.** Vestígio de a planilha ter sido
   criada por cópia. Não é usada por nenhuma fórmula, mas vaza o nome de um
   contrato de terceiro.

---

## 6. Metadados e dado pessoal presentes no arquivo

- Criador: `Welton Teixeira Da Silva`
- Última modificação por: `CLEITON RODRIGUES`
- Autores de comentário: `Welton Teixeira Da Silva`, `Inforcell`
- Rótulo de sensibilidade da Microsoft aplicado em 2022, ainda nos metadados
- 19 nomes completos de trabalhadores com função e data de admissão na obra
- Nome, titulação e número de CREA do engenheiro responsável
- Endereço IP interno do servidor de arquivos e a árvore de pastas da empresa
- Coordenadas geográficas de bota-fora e nomes de fiscais da Prefeitura no texto
  das observações

Consequência prática: **este arquivo não entra no repositório**. Ver `.gitignore`
e `referencia/README.md`.
