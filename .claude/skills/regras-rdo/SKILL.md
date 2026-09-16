---
name: regras-rdo
description: As regras de cálculo do RDO em formato consultável — efetivo, produção acumulada, número do RDO, resumo pluviométrico, taxonomias e limites de página. Use ao implementar ou revisar qualquer cálculo do RDO digital.
---

# Regras do RDO — referência rápida

Versão consultável de `docs/dominio/regras-extraidas.md`. O documento longo tem a
origem e o raciocínio; aqui está o que você precisa para escrever o cálculo.

Convenção: **[HERDAR]** vale para o produto novo. **[NÃO HERDAR]** é defeito da
planilha. **[DECIDIDO 16/09/2026]** é resposta dada por quem responde pelo
produto, registrada em `docs/prd/v1-decisoes.md` e em `docs/dominio/duvidas.md`.
**[PENDENTE]** ainda depende de decisão — não escolha por conta própria.

As 42 decisões da v1 foram tomadas em 16/09/2026 e **não há pergunta aberta no
PRD**. Nada aqui espera resposta. Quando algo novo aparecer, volta para
`docs/prd/v1.md` como pergunta, nunca como decisão tomada por conta própria.

---

## 1. Efetivo do dia

```
efetivo(funcao, dia) =
  se o dia esta PARADO -> 0
  senao, pessoas com essa funcao que tenham uma passagem com
         ENTRADA <= dia  e  (SAIDA nula ou SAIDA >= dia)
```

- **[DECIDIDO 16/09/2026]** a pessoa **conta** no dia em que sai: a data de saída
  é o último dia trabalhado. Por isso `SAIDA >= dia`, e não `>`. Decisão 1.1.
- **[DECIDIDO 16/09/2026]** equipamento usa **a mesma** regra. Decisão 1.2.
  Acabou a divergência da planilha, que tinha três comportamentos.
- **[DECIDIDO 16/09/2026]** o efetivo é o **mobilizado**, e sai **zerado quando o
  dia está parado**. Decisão 5.1. Ninguém marca presença dia a dia.
- **[HERDAR]** pessoal agrega por **função**; equipamento agrega por
  **identificador**. Duas granularidades diferentes, de propósito.
- **Atenção ao modelo:** a contagem é por **passagem**, não por pessoa. Uma pessoa
  que sai e volta tem duas passagens e continua sendo uma pessoa. Contar linhas de
  cadastro daria dois. Caso de teste 8.

## 2. Produção por serviço controlado

```
executado(servico, dia)  = soma dos lancamentos daquele servico naquele dia
acumulado(servico, dia)  = soma dos lancamentos daquele servico ate o dia, inclusive
percentual(servico, dia) = acumulado / quantidade de projeto     (protegido contra divisao por zero)
```

- **[HERDAR]** o acumulado é **sempre recalculado**, nunca guardado. Corrigir
  março tem que corrigir setembro sozinho.
- **[HERDAR]** as quatro colunas do bloco: EXEC., ACUM., PROJETO, percentual.
- **[NÃO HERDAR]** casar serviço por igualdade exata de texto. Use referência ao
  cadastro.
- **[NÃO HERDAR]** silêncio quando o acumulado passa do projeto. Avise; não
  bloqueie. Caso de teste 6.
- Quantidade é decimal com casas que importam, como `2210.392`. Ponto flutuante
  binário não serve para somar acumulado.

## 3. Número do RDO

```
numero(dia) = dia − data de inicio do contrato
```

- **[HERDAR]** a fórmula: é o número que o fiscal reconhece. Em 01/09/2026, com
  início em 05/02/2026, dá 208.
- **[HERDAR]** conta dia corrido: inclui sábado, domingo, feriado e dia parado.
- **[DECIDIDO 16/09/2026]** o primeiro dia do contrato é o **RDO 0**, como na
  planilha. Decisão 6.1.
- **[DECIDIDO 16/09/2026]** o número **congela no fechamento do dia**. Decisão
  6.2. Antes de fechar, é calculado; ao fechar, é gravado junto com o fechamento e
  nunca mais muda. Mudar a data de início da obra passa a não renumerar o que já
  foi entregue ao fiscal.
- Consequência para o teste: o número é derivado **enquanto o dia está aberto** e
  armazenado **depois de fechado**. É a única exceção à regra de que RDO nunca é
  armazenado, e existe por rastreabilidade contratual.

## 4. Resumo do dia da pluviometria

Três turnos: noite anterior, manhã, tarde. Cada um recebe `B` bom, `C` chuva ou
`I` impraticável. Mais um índice em mm.

Árvore **corrigida**, decisão 3.1 de 16/09/2026. Na ordem, para na primeira
verdadeira:

```
1. tres letras B                      -> "Trabalhado"
2. existe C  e  indice <  10          -> "Trabalhado"
3. existe C  e  indice >= 10          -> "Perca de producao"     <-- era > 10
4. existe I                           -> "Impraticavel"
5. caso contrario                     -> vazio
```

- **[DECIDIDO 16/09/2026]** o passo 3 usa **maior ou igual a 10**. O buraco da
  planilha, em que 10 exato caía no vazio, está fechado. Caso de teste 3 continua
  obrigatório, agora com expectativa definida: 10 mm com chuva é
  `Perca de produção`.
- **[DECIDIDO 16/09/2026]** chuva com índice **0** continua `Trabalhado`, como na
  planilha. Decisão 3.2. É o passo 2, e é intencional.
- **[DECIDIDO 16/09/2026]** o resumo do dia aparece **na tela** do RDO diário e
  **não no PDF**, porque o gabarito impresso não tem esse campo. Decisão 3.3.
- **[HERDAR]** as grafias exibidas: `Perca de produção`, `Impraticavél`. São o
  vocabulário do cliente, erros de ortografia incluídos.
- **[DECIDIDO 16/09/2026]** o PDF imprime **a letra** `B`, `C` ou `I` nos três
  turnos, não a palavra por extenso. Decisão 2.3. Turno em branco sai vazio.
- **[HERDAR]** o acumulado de chuva zera a cada mês.
- **[NÃO HERDAR]** comparar termo por igualdade exata. No Excel a comparação
  ignora maiúsculas e `Perca de Produção` casa com `Perca de produção`. Em código,
  não casa. Caso de teste 13.
- A macro VBA pinta uma quarta letra, `N`, que a árvore não conhece.

## 5. Dia sem trabalho

- **[NÃO HERDAR]** transformar dia parado em atividade com texto "Não houve
  atividades" e status `Produção`. São 110 linhas assim na planilha, com 13 textos
  distintos, e 61 delas não declaram motivo nenhum.
- **[DECIDIDO 16/09/2026]** o dia tem **três estados**: `não lançado`, `parado`,
  `trabalhado`. Decisão 4.2. Ninguém ter lançado é diferente de ter lançado que
  não houve trabalho.
- **[DECIDIDO 16/09/2026]** dia parado tem **motivo** e zero atividades. Decisão
  4.1; a forma do motivo está na decisão 20.1, abaixo. Tentar lançar atividade num
  dia parado é **rejeitado** com mensagem, e isso não muda o estado do dia.
  Decisão 4.3. Caso de teste 4.
- **[DECIDIDO 16/09/2026]** no PDF, o motivo sai na **primeira linha do bloco
  ATIVIDADES**, que é onde o fiscal está acostumado a lê-lo. Decisão 4.1.
- **[DECIDIDO 16/09/2026]** efetivo de pessoal e de equipamento sai **zerado** em
  dia parado. Decisão 5.1.
- **[DECIDIDO 16/09/2026]** o motivo é **texto livre e obrigatório** quando o dia
  é parado. Decisão 20.1. Oito sugestões tocáveis preenchem o campo sem fechá-lo:
  `Domingo`, `Feriado`, `Chuva`, `Excesso de umidade no trecho`,
  `Interferência de terceiro`, `Impraticável`, `Sem frente de serviço`, `Outro`.
  Não existe campo `complemento`: o texto livre do motivo já o absorve.
- **[DECIDIDO 16/09/2026]** só o **engenheiro** retifica lançamento em dia
  fechado, e retifica o de **qualquer autor**, inclusive os dele. Decisão 22.1.

## 6. Composição do RDO diário

Tudo é buscado pela data do dia:

| Bloco               | Fonte                               | Casamento               |
| ------------------- | ----------------------------------- | ----------------------- |
| efetivo pessoal     | cadastro de pessoal                 | intervalo contra a data |
| efetivo equipamento | cadastro de equipamento             | intervalo contra a data |
| produção            | lançamentos de produção             | data igual, e data ≤    |
| atividades          | lançamentos de atividade            | data igual              |
| pluviometria        | lançamento de pluviometria          | data igual              |
| observações         | lançamentos de observação, por lado | data igual              |

**Limites de página herdados do layout**, que precisam de tratamento explícito de
transbordo:

- **15 atividades** por RDO diário. Máximo real observado: 11.
- **4 linhas de comentário** em 30 das 31 abas; 7 na aba `05`.
- **41 colunas** de função e 41 de equipamento. Em uso: 12 e 14.
- **4 serviços controlados**, posições fixas.

Transbordo nunca é truncamento silencioso.

## 7. Datas

- **[NÃO HERDAR]** encadear o dia seguinte a partir do anterior. É assim que
  aparece o dia 31 de setembro. Caso de teste 10.
- Data de obra é **dia puro**, sem hora, com fuso definido em um lugar só.
- Exibição sempre `dd/mm/aaaa`. A planilha usa formato americano em metade das
  abas.
- O mês de referência é derivado da data consultada, nunca do nome do arquivo.
  Caso de teste 12.

## 8. Períodos de BMS

```
dias do periodo = data final − data inicial + 1
```

- **[HERDAR]** a contagem, com validação de que a final não é anterior à inicial.
  A planilha tem um período de **-716 dias**. Caso de teste 9.
- **[DECIDIDO 16/09/2026]** não existe ciclo fixo. O engenheiro **cadastra os
  períodos de BMS da obra** (número, início, fim) e o RDO deriva o número pela
  data do dia. Decisão 7.1. A tabela legada, que ia de 2022 a 2025 e não cobria
  2026, é descartada.
- **[DECIDIDO 16/09/2026]** cadastrar **ao menos um período é obrigatório ao criar
  a obra**. Decisão 21.1. Obra sem período nenhum não existe.
- Consequência: existe a entidade **Período de BMS**, com a mesma validação de
  data final não anterior à inicial. Data não coberta por nenhum período sai com
  `BM'S` vazio e aviso na tela, nunca com erro nem bloqueio de exportação.

---

## Taxonomias, com a grafia exata

**Status de atividade** (14; só 8 já foram usados):
`Produção`, `Informativo`, `Pendências - Cliente`, `Pendências - CROS`,
`Mobilização`, `Desmobilização`, `Alterações - Cliente`, `Fornecimento`,
`Removido/Alteração`, `Serviço Fo. Es.`, `Paralisação`, `Transporte`, `Limpeza`,
`Levantamento`.

**Condição de tempo** (6): `Bom`, `Nublado`, `Chuvoso`, `Chuva Parcial`,
`Impraticável`, `---`.
**Não existe mais no produto.** A decisão 2.1, de 16/09/2026, escolheu registrar o
tempo só pelos três turnos mais o índice em mm. Pedir as duas coisas ao
encarregado feria o lançamento rápido em celular, e o PDF só imprime os turnos.
Fica aqui como registro do que a planilha tinha.

**Turno de pluviometria** (3): `B`, `C`, `I`. É a única taxonomia de tempo do
produto. A letra `N` que a macro VBA pinta não entra.

**Motivo de dia parado**: **não é taxonomia fechada.** É texto livre obrigatório
(20.1) com oito sugestões: `Domingo`, `Feriado`, `Chuva`,
`Excesso de umidade no trecho`, `Interferência de terceiro`, `Impraticável`,
`Sem frente de serviço`, `Outro`. Comparação e agrupamento continuam insensíveis a
caixa e a espaços nas pontas.

**Resumo do dia** (3): `Trabalhado`, `Perca de produção`, `Impraticavél`.

**Serviços controlados** (4): `REC.(FRESA+CAPA)`, `REC.(FRESA+BINDER+CAPA)`,
`RECICLAGEM(BASE+CAPA)`, `IM.(SUBLEITO+BASE+CAPA)`.

**Status do mapa linear** (fora da v1): `1` Base Concluida, `2` Liberado,
`3` Em Execução, `4` Concluído, mais `Pendências` sem código e um `5` que só
existe na formatação condicional.

Todas são **tabela de domínio editável**, nunca constante no código: a validação
da planilha já reserva duas linhas vazias para termos novos.

---

## Regras que a planilha não tem e o produto precisa

Fechamento do dia · autoria do lançamento · validação cruzada entre produção e
atividade · fuso · controle de acesso · limite de acumulado contra projeto ·
pessoa ou equipamento com mais de uma passagem pela obra.
