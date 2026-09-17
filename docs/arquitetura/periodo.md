# RDO de período — contrato entre as frentes

Status: proposto em 17/09/2026 · Autor: `arquiteto`
Entrada: decisões do dono do produto de 17/09/2026 (abaixo, `DP1` a `DP9`),
`docs/arquitetura/v1.md`, `CLAUDE.md`, `.claude/skills/regras-rdo/SKILL.md`,
e o código do diário já entregue (`src/modules/rdo/**`, `src/modules/export/**`).

Este documento define **a forma**, não a implementação. Ele existe para que três
frentes possam correr em paralelo sem produzir duas noções de "executado no
período", duas contas de média e dois formatos de faixa de RDO.

Continua valendo, sem exceção, tudo de `docs/arquitetura/v1.md`: **R5** (nada de
RDO montado em tabela), módulo não importa de módulo, `obra_id` em toda consulta,
verificação de perfil no servidor em toda requisição.

---

## 0. O que já está decidido e não se reabre

Decisões do dono do produto, 17/09/2026. Ainda **sem número no PRD**: entrar em
`docs/prd/v1.md` é tarefa do coordenador, e a numeração seguinte livre é a
**38**. Enquanto isso, cito por `DP`.

| #   | Decisão                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DP1 | A entrada é um **conjunto de dias**, não um intervalo. "Três RDOs" pode ser 02, 05 e 09, não contíguos                                                                                                       |
| DP2 | Efetivo pessoal e de equipamento: **média por dia**. Dia não lançado **não entra no divisor**                                                                                                                |
| DP3 | Atividades: **todas, por data**. Nada agrupado, nada deduplicado                                                                                                                                             |
| DP4 | Pluviometria: **total de mm no período**, contagem de dias por letra (`B`, `C`, `I`) e contagem de dias parados                                                                                              |
| DP5 | A letra do dia é a **pior dos três turnos**                                                                                                                                                                  |
| DP6 | Produção: `EXEC.` = executado **no período**; `ACUM.` = acumulado da obra **até o último dia** do período; `%` = acum ÷ projeto                                                                              |
| DP7 | ~~`RDO Nº` sai como faixa~~ — **REVISADA em 17/09/2026**: sai como **lista**, `209, 212, 216`. Faixa afirmaria continuidade que o conjunto pode não ter. `BM'S` lista todos os períodos que o conjunto cobre |
| DP8 | Observações: todas, por data. Assinatura: **responsável técnico vigente**                                                                                                                                    |
| DP9 | Três modos de exportação: só consolidado, só diários, consolidado + diários anexados. **Excel espelha o documento**                                                                                          |

**Aviso de escopo, não discordância.** `CLAUDE.md`, seção "Fora do escopo da
v1", ainda lista "RDO semanal e mensal" e "Exportação em Excel". DP1 a DP9
mudam isso. `CLAUDE.md` e `docs/prd/v1.md` são arquivos compartilhados: a
atualização é do **coordenador**, e nenhuma frente começa antes dela. Frente que
implementar contra este documento com o `CLAUDE.md` antigo está construindo fora
do escopo escrito, que é exatamente o que a regra quer evitar.

---

## 1. O tipo do pedido — onde o conjunto deixa de ser hostil

### 1.1 O tipo

```
PedidoDeRdoDePeriodo {
  obraId: ObraId
  dias:   readonly DiaPuro[]   // ordenado crescente, sem repetição, não vazio
}
```

Três propriedades são **do tipo**, garantidas pela única função que o constrói, e
não da disciplina de quem chama: ordenado, sem repetição, não vazio. Quem recebe
um `PedidoDeRdoDePeriodo` não precisa reordenar nem deduplicar, e não existe
segundo lugar que decida a ordem.

**É `DiaPuro[]`, não `{ dataInicial, dataFinal }`.** DP1 é a razão, e a
consequência é grande: `EXEC.` do conjunto `{02, 05, 09}` não pode somar o dia 03.
Um tipo de intervalo permitiria escrever essa soma sem que ninguém percebesse.

### 1.2 Onde cada coisa é validada

Arquivo: `src/modules/rdo/borda/esquemas-de-periodo.ts`, função
`interpretaPedidoDeRdoDePeriodo(bruto: unknown): Result<PedidoDeRdoDePeriodo, ErroDeEntrada>`.
Mesma postura de `src/modules/rdo/borda/esquemas.ts:47-64`: `safeParse`, nunca
`parse`; o esquema **não devolve `string`**, devolve tipo de marca.

Na ordem, e a ordem importa:

| Ordem | O que                                                                       | Por que aí                                                                                       |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | `z.array(...).min(1).max(366)` — **comprimento antes de olhar item nenhum** | um array de 100 mil itens não pode custar 100 mil validações de calendário antes de ser recusado |
| 2     | cada item por `criaDiaPuro`                                                 | `2026-09-31` é recusado pelo calendário real (`src/shared/date/dia.ts:54-87`), como no diário    |
| 3     | ordenação crescente e remoção de repetidos                                  | conjunto é conjunto; dia repetido dobraria `EXEC.` e o total de mm                               |
| 4     | conjunto vazio depois da normalização                                       | não acontece, porque `min(1)` já barrou; a recusa fica como rede                                 |
| 5     | **dia fora do período do contrato** → recusa do pedido inteiro              | decisão 23.1; ver 1.4                                                                            |

O teto é o **mesmo** `DIAS_MAXIMOS_DA_CONSULTA = 366` de
`src/modules/rdo/borda/esquemas.ts:76`, reaproveitado, não redeclarado. Muda o
que ele conta: no diário era a **extensão** do intervalo, aqui é a
**cardinalidade** do conjunto, porque conjunto não tem extensão. O motivo é o
mesmo escrito lá, e continua sendo o principal: pedir dez anos numa requisição é
o jeito mais barato de derrubar o servidor de dentro, com sessão válida.

### 1.3 Repetição é normalizada em silêncio; corte nunca é

Dia repetido é removido **sem erro**, porque tocar duas vezes no mesmo RDO na
tela não é mentira do usuário. Mas o resultado **devolve o conjunto normalizado**
em `identificacao.dias`, e a tela mostra o que foi de fato usado. Normalizar
calado e não mostrar seria o corte silencioso que o projeto proíbe.

### 1.4 Dia fora do contrato recusa o pedido inteiro

Decisão 23.1 vale por dia: RDO de dia fora do contrato não existe. Num conjunto,
a escolha é entre **filtrar** os dias inválidos e **recusar** tudo. Recuso tudo:
filtrar produziria um consolidado com faixa de RDO e total de mm calculados sobre
menos dias do que a pessoa escolheu, e ela não saberia. A mensagem nomeia até
**três** datas e diz quantas são no total — mensagem é para quem vai agir, e uma
lista de 300 datas não é acionável.

### 1.5 O pedido viaja no corpo, nunca na URL

Server Action para a tela, `POST` para a exportação. 366 dias em `?dias=` dão
mais de 4.000 caracteres: vira `414`, entra inteiro no log de acesso e quebra em
proxy. **Alternativa recusada:** `GET` com lista na query, que seria
marcável nos favoritos. Recusada pelo comprimento; o consolidado é documento que
se gera, não endereço que se guarda.

---

## 2. O tipo do resultado — `RdoDePeriodo`, bloco a bloco

Convenção herdada de `src/modules/rdo/tipos.ts:111-132`, e mantida: **campo cru
mais `campoTexto`**. O cru existe para quem calcula e para o teste; o texto existe
para que tela, PDF e Excel não divirjam (R18). Onde o campo é uma contagem
inteira, **não há `Texto`**: `String(n)` não é decisão de formatação.

Arquivo: `src/modules/rdo/periodo/tipos.ts`.

### 2.1 Identificação

| Campo                | Tipo                 | O que é                                                                               |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `dias`               | `readonly DiaPuro[]` | o conjunto normalizado, devolvido para a tela conferir                                |
| `quantidadeDeDias`   | `number`             | `dias.length`                                                                         |
| `diasLancados`       | `number`             | quantos têm registro de dia; é o **divisor** de DP2                                   |
| `primeiroDia`        | `DiaPuro`            | `dias[0]`                                                                             |
| `ultimoDia`          | `DiaPuro`            | `dias[n-1]`; é a data de corte do `ACUM.` (DP6)                                       |
| `periodoTexto`       | `string`             | `02/09/2026 a 09/09/2026`. Sempre faixa, sempre `dd/mm/aaaa`                          |
| `eContiguo`          | `boolean`            | `quantidadeDeDias === diferencaEmDias(primeiro, ultimo) + 1`                          |
| `numeroDoRdoInicial` | `number`             | **menor** número calculado, não o do primeiro dia. Ver abaixo                         |
| `numeroDoRdoFinal`   | `number`             | **maior** número calculado                                                            |
| `numerosDoRdo`       | `readonly number[]`  | Um por dia escolhido, em ordem. **Faixa não é representável neste tipo**, e é o ponto |
| `numerosDoRdoTexto`  | `string`             | `209, 212, 216`; com um dia só, `209`                                                 |
| `bms`                | `readonly number[]`  | todos os BMS que o conjunto cobre, crescente, sem repetição (DP7)                     |
| `bmsTexto`           | `string`             | `3, 4`; vazio quando nenhum período cobre dia nenhum                                  |

**`numeroDoRdoInicial` é `min` sobre os números calculados, não o número do
primeiro dia.** Parece a mesma coisa e não é: a decisão 6.2 congela o número no
fechamento, e se a data de início da obra mudar depois disso, o número congelado
de um dia fechado deixa de ser monótono em relação ao calculado de um dia aberto.
`min`/`max` continuam certos nos dois mundos; `numero(primeiro) a numero(ultimo)`
não. O cálculo de cada dia passa por `calculaNumeroDoRdo`
(`src/modules/rdo/numero-do-rdo.ts`) e por mais nada, como no diário.

### 2.2 Cabeçalho da obra

`informacoesGerais: InformacoesGerais` e `caracteristicasDoProjeto:
CaracteristicasDoProjeto` — **os mesmos tipos** de `src/modules/rdo/tipos.ts:38-51`,
importados de lá (é o mesmo módulo, não é import entre módulos). São leitura de
cadastro e não dependem do dia; não existe versão "de período" deles.

`responsavelTecnico: ResponsavelTecnico | null` — o **vigente** (DP8), lido uma
vez do cabeçalho da obra. Consequência que precisa estar escrita: um conjunto que
atravessa a troca de responsável técnico sai assinado pelo atual, e não pelo que
respondia em cada dia. É o que DP8 pede; se um dia isso mudar, muda em um lugar
só, porque o campo vem do `cabecalho` e de nenhum outro.

### 2.3 Efetivo, os dois blocos

```
ColunaDeEfetivoMedio {
  chave: string            // id do cadastro, nunca um nome
  rotulo: string           // grafia exata da função / identificador do equipamento
  somaDoPeriodo: number    // numerador: soma dos efetivos diários, inteiro
  mediaPorDia: Quantidade | null
  mediaTexto: string       // uma casa decimal; vazio quando zero ou sem divisor
}

BlocoDeEfetivoMedio {
  colunas: readonly ColunaDeEfetivoMedio[]
  diasConsiderados: number          // o divisor de DP2
  mediaTotal: Quantidade | null
  mediaTotalTexto: string
}
```

Cinco regras que o tipo carrega:

1. **O divisor é `diasConsiderados`**, o número de dias do conjunto com registro
   de dia. Dia `não lançado` fica fora (DP2). Dia **parado** fica **dentro**, com
   efetivo zero (decisão 5.1), e portanto puxa a média para baixo. Isso é
   consequência querida das duas decisões juntas, não descuido — e é caso de teste
   obrigatório.
2. **`somaDoPeriodo` e `diasConsiderados` aparecem no tipo** justamente para que
   qualquer um refaça a divisão. Média é o único número do RDO que não leva de
   volta ao lançamento; os dois ingredientes ficam à vista.
3. **`mediaTotal` é calculada sobre os totais diários**, não somando as médias já
   arredondadas das colunas. As duas contas são iguais na álgebra e diferem no
   arredondamento; a diferença é resíduo esperado, e "consertar" o total para
   bater com a soma das colunas exibidas é justamente o defeito de planilha que
   não se herda.
4. **`null` é ausência de divisor**, não zero. Conjunto sem nenhum dia lançado
   dá `mediaPorDia: null`, `mediaTexto: ''` e o aviso `PERIODO_SEM_DIA_LANCADO`.
   Média zero também exibe vazio, porque o gabarito mostra célula em branco no
   lugar do `0` (`src/modules/rdo/efetivo.ts:53-62`); quem distingue os dois casos
   é o aviso, que é de tela.
5. **A regra de quem está na obra no dia não é reescrita.** O período chama
   `calculaEfetivoPessoal` e `calculaEfetivoDeEquipamento`
   (`src/modules/rdo/efetivo.ts:98-138`) **uma vez por dia** e faz a média. O dia
   da saída, a pessoa com duas passagens e o zeramento em dia parado continuam
   valendo por construção, num lugar só.

### 2.4 Produção

```
LinhaDeProducaoDoPeriodo {
  servicoId: ServicoControladoId
  nome: string
  executadoNoPeriodo: Quantidade      executadoTexto: string
  acumulado: Quantidade               acumuladoTexto: string
  projeto: Quantidade                 projetoTexto: string
  percentualTexto: string
  fracaoDoProjeto: number
  acumuladoAcimaDoProjeto: boolean
  lancamentosDoExecutado: readonly LancamentoId[]
  lancamentosDoAcumulado: readonly LancamentoId[]
}
```

- `executadoNoPeriodo` soma os lançamentos cuja data **pertence ao conjunto**.
  Não é `data >= primeiro && data <= ultimo`: para `{02, 05, 09}`, o dia 03 fica
  de fora. É o ponto em que um tipo de intervalo teria mentido.
- `acumulado` é o acumulado da obra **até `ultimoDia`, inclusive**, sobre todos os
  dias, inclusive os que não estão no conjunto (DP6). Recalculado do zero, sempre
  (R5).
- `percentualTexto` e `fracaoDoProjeto` saem de `acumulado ÷ projeto`, protegidos
  contra denominador zero, como no diário.
- **Nada disto é reimplementado.** `calculaProducaoControlada`
  (`src/modules/rdo/producao.ts:56-97`) é chamada por dia do conjunto; o
  `executado` de cada chamada é somado, e `acumulado`, `projeto`, `fracao` e
  `lancamentosDoAcumulado` vêm da chamada do **último dia**. Uma regra, uma
  função, dois relatórios.
- `acumuladoAcimaDoProjeto` continua sendo `>`, nunca `>=`: serviço concluído não
  nasce marcado como estourado (caso obrigatório 6).

### 2.5 Atividades, por data

```
GrupoDeAtividadesDoDia {
  dia: DiaPuro
  dataBr: string
  numeroDoRdo: number
  estado: EstadoDoRdo                       // 'trabalhado' | 'parado' | 'nao lancado'
  linhas: readonly LinhaDeAtividade[]       // o tipo do diário, sem mudança
}
```

`atividades: readonly GrupoDeAtividadesDoDia[]`, ordenado por dia crescente;
dentro do dia, a ordem que a porta entregou, que é a ordem do diário
(`raiz.registrado_em`, desempate por id).

Três decisões dentro deste tipo:

- **`LinhaDeAtividade` é reaproveitado inteiro** (`src/modules/rdo/tipos.ts:62-69`),
  inclusive a variante `motivo-de-parada`. Dia parado dentro do conjunto aparece
  com o motivo na primeira linha do seu grupo, como no diário (decisão 4.1).
- **Dia `não lançado` gera grupo vazio, não some da lista.** Sumir seria corte
  silencioso: o leitor precisa ver que 05/09 não foi lançado, e não deduzir do
  buraco na sequência.
- **Nada é deduplicado nem agrupado por descrição** (DP3). Duas atividades com o
  mesmo texto em dias diferentes são duas linhas.

### 2.6 Pluviometria

```
PluviometriaDoPeriodo {
  totalMm: Quantidade        totalMmTexto: string   // `123 mm`, via formataIndiceMm
  diasB: number
  diasC: number
  diasI: number
  diasSemLeitura: number
  diasParados: number
}
```

- `totalMm` soma o índice **dos dias com lançamento**. Dia sem leitura contribui
  nada; ausência não é zero (`src/modules/rdo/formata.ts:15-28` já carrega essa
  distinção).
- A letra do dia é a **pior dos três turnos** (DP5), com a gravidade
  `I > C > B`. Fica numa função só, `piorLetraDoDia(p): LetraDeTurno | null`, em
  `src/modules/rdo/periodo/letra-do-dia.ts`.
- **Turno em branco:** DP5 não disse o que fazer, e a decisão 2.2 aceita turno
  vazio. Assumo: turnos em branco são **ignorados** na escolha da pior; dia com os
  três em branco não conta em letra nenhuma e entra em `diasSemLeitura`. É ponto
  pendente **PP-2**, isolado nessa mesma função — a resposta muda uma linha.
- `diasParados` vem do **estado do dia**, não da pluviometria. Está neste bloco
  porque DP4 descreve o bloco do documento assim; a fonte é `diasDeObra`, e o
  comentário no código precisa dizer isso para ninguém procurar no lugar errado.
- As contagens são inteiros e imprimem `0` quando zero. A regra "zero em branco"
  é do efetivo, não de contador de dias.

### 2.7 Observações e avisos

```
GrupoDeObservacoesDoDia { dia; dataBr; textos: readonly string[]; linhas: readonly string[] }
```

`comentariosCros: readonly GrupoDeObservacoesDoDia[]`, por data (DP8), com a
mesma quebra em linhas do diário. `comentarioContratante: readonly string[]`
continua vazio na v1 (decisão 10.1).

`avisos: readonly AvisoDoRdo[]` — reaproveita o tipo e os códigos de
`src/modules/rdo/tipos.ts:87-101`, com três códigos novos, **de tela**, que nunca
entram no documento:

| Código                    | Quando                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `CONJUNTO_NAO_CONTIGUO`   | `eContiguo === false`. O documento não afirma mais continuidade (a lista substituiu a faixa), mas o aviso continua útil na tela |
| `DIAS_NAO_LANCADOS`       | `diasLancados < quantidadeDeDias`                                                                                               |
| `PERIODO_SEM_DIA_LANCADO` | `diasLancados === 0`; não há divisor para a média                                                                               |

**Não existe `resumoDoDia` no `RdoDePeriodo`.** Resumo é de um dia; no período o
que existe é a contagem por letra.

### 2.8 Transbordo

O consolidado **não tem** campo `transbordo`. Os limites de
`src/modules/rdo/limites.ts:12-14` são do **gabarito do diário** e não se aplicam:
15 atividades é o que cabe numa página de um dia, não um orçamento de linhas de um
relatório de 30 dias. O consolidado carrega tudo e o renderizador quebra as
páginas com o cabeçalho preso ao alto, que já existe
(`src/modules/export/documento/documento-rdo.tsx:76-87`).

A exceção é o efetivo: `COLUNAS_DE_EFETIVO_NA_PAGINA_1 = 41` é **largura física**
de papel, não orçamento de conteúdo, e continua valendo no consolidado.

---

## 3. A porta de leitura — e por que não é a do diário chamada N vezes

### 3.1 O tipo

Arquivo: `src/modules/rdo/periodo/portas.ts`.

```
RegistroDeDiaDoConjunto = DiaDeObra & { dia: DiaPuro }
AtividadeDeUmDia        = AtividadeDoDia   & { data: DiaPuro }
PluviometriaDeUmDia     = PluviometriaDoDia & { data: DiaPuro }
ObservacaoDeUmDia       = ObservacaoDoDia  & { data: DiaPuro }
FaixaDeBms              = { numero: number; dataInicial: DiaPuro; dataFinal: DiaPuro }

PortasDoRdoDePeriodo {
  // idênticas às do diário, e chamadas UMA vez: não dependem do dia
  cabecalho(obraId)
  funcoes(obraId)
  pessoalMobilizado(obraId)
  equipamentosMobilizados(obraId)
  servicos(obraId)

  // reaproveitada sem mudança: o ACUM. de DP6 é exatamente ela no último dia
  lancamentosDeProducaoAte(obraId, dia)

  // novas, e todas recebem o CONJUNTO
  periodosBms(obraId):                            readonly FaixaDeBms[]
  diasDeObra(obraId, dias):                       readonly RegistroDeDiaDoConjunto[]
  atividadesDosDias(obraId, dias):                readonly AtividadeDeUmDia[]
  pluviometriaDosDias(obraId, dias):              readonly PluviometriaDeUmDia[]
  observacoesCrosDosDias(obraId, dias):           readonly ObservacaoDeUmDia[]
}
```

Todas devolvem `Promise<Result<..., ErroDeDominio>>`, como as do diário.
Todas continuam **sem campo de nome e sem campo de autor**, pela mesma razão
escrita em `src/modules/rdo/portas.ts:10-24`: o que não chega ao módulo não vaza.

`periodosBms` devolve as faixas cadastradas e o casamento com os dias acontece em
memória, numa função pura `resolveBmsDosDias(faixas, dias)`. É a irmã plural de
`resolveBmsDoDia`, que a frente A já tem; não é a mesma chamada N vezes.

### 3.2 Por que não `PortasDoRdo` N vezes

Não pode, e por três motivos em ordem de gravidade.

1. **Determinismo.** `montaRdoDiario` faz doze `await` por dia
   (`src/modules/rdo/monta-rdo-diario.ts:46-78`). Trinta dias são trezentas e
   sessenta consultas separadas, e uma retificação concorrente no meio delas faz o
   dia 02 vir de antes e o dia 09 de depois. O consolidado sairia com dois
   instantâneos no mesmo documento, e — pior — em desacordo com os diários que ele
   próprio anexa. Porta que recebe o conjunto vira uma consulta com `data IN (...)`,
   um instantâneo só.
2. **Custo, que aqui é superfície de ataque.** Cinco das onze portas do diário não
   dependem do dia; chamá-las N vezes repete a mesma consulta N vezes. Com o teto
   de 366 dias, a diferença é entre ~4.000 idas ao banco e cinco mais quatro. O
   teto foi justificado em `src/modules/rdo/borda/esquemas.ts:66-76` como defesa
   contra derrubar o servidor de dentro; um desenho que multiplica consultas por
   dia desfaz essa defesa.
3. **Assimetria real do domínio.** `ACUM.` não é por dia: é uma leitura só, até
   `ultimoDia`. `BM'S` não é por dia: é o conjunto de faixas que os dias cobrem.
   Espremer os dois no formato "uma chamada por dia" seria modelar contra o
   domínio para reaproveitar uma assinatura.

### 3.3 Os diários anexados saem do mesmo instantâneo

Os modos 2 e 3 de DP9 precisam dos `RdoDiario` completos. **Não** se chama
`montaRdoDiario` contra o banco N vezes. O período busca uma vez pelas portas
plurais e constrói, em memória, um `PortasDoRdo` sobre os dados já resolvidos:

```
portasDeMemoria(dadosDoConjunto): PortasDoRdo
```

em `src/modules/rdo/periodo/portas-de-memoria.ts`. Com isso:

- `monta-rdo-diario.ts` **não muda uma linha** e continua sendo o único lugar que
  sabe montar um RDO de um dia;
- consolidado e anexos vêm do mesmo instantâneo, e não podem discordar;
- o custo de N diários é CPU, não banco.

**Alternativa recusada:** extrair de `montaRdoDiario` um núcleo puro e chamá-lo
dos dois lados. Recusada porque mexeria no diário já entregue, revisado e coberto
por testes de fidelidade, para ganhar o que a porta em memória já dá de graça.

---

## 4. Contrato com `export` — os três modos

### 4.1 Um parâmetro, não três funções

`ModoDeExportacaoDePeriodo = 'consolidado' | 'diarios' | 'consolidado-com-diarios'`

**Decidido: um parâmetro**, no caso de uso. Três funções exportadas precisariam
cada uma repetir a verificação de perfil, a gravação da trilha antes da entrega e
a montagem do arquivo, e a terceira seria a concatenação das outras duas — três
cópias da regra "sem trilha não há exportação", que é exatamente o tipo de regra
que se perde na terceira cópia. Com um parâmetro, o modo é um **valor**: a borda
o valida com `z.enum`, a trilha o grava, e o teste o percorre.

### 4.2 A forma que a projeção produz

Em `src/modules/rdo/periodo/para-documento-de-periodo.ts` (a projeção do
consolidado) e na montagem do pacote:

```
PacoteParaDocumento =
  | { modo: 'consolidado';             consolidado: RdoDePeriodoParaDocumento }
  | { modo: 'diarios';                 diarios: readonly RdoParaDocumento[] }
  | { modo: 'consolidado-com-diarios'; consolidado: RdoDePeriodoParaDocumento;
                                       diarios: readonly RdoParaDocumento[] }
```

**União discriminada, não um objeto com dois campos anuláveis.** `padroes-codigo`
manda modelar o impossível fora do tipo: `{ consolidado: null, diarios: [] }`
seria um pacote vazio que compila, e alguém acabaria gerando um PDF de zero
páginas com a trilha já gravada.

`RdoParaDocumento` é **o tipo que já existe** (`src/modules/export/portas.ts:97-116`),
produzido pelo `paraDocumento` que já existe (`src/modules/rdo/para-documento.ts:121-187`).
Os diários anexados reusam a projeção já conferida pelo agente de fidelidade.

`RdoDePeriodoParaDocumento` segue a mesma disciplina do irmão diário: **tudo é
texto pronto para imprimir**, mais `fracao: number` onde há barra. Nenhuma decisão
de formatação acontece no `export`. É o que impede a tela, o PDF e o Excel de
divergirem.

Ordem das páginas no modo 3: **consolidado primeiro, diários depois, em ordem
crescente de dia.** O fiscal lê o resumo e depois a evidência.

### 4.3 Excel espelha, não recalcula

`src/modules/export/periodo/excel/` consome **o mesmo `PacoteParaDocumento`**,
nunca `RdoDePeriodo`. É a garantia de que PDF e Excel não podem discordar: o
escritor de planilha não tem número cru para arredondar do seu jeito.

Duas obrigações do escritor, que valem como Crítico na revisão:

- **Injeção de fórmula.** Valor que começa com `=`, `+`, `-` ou `@` vira fórmula
  ao abrir. Isto **não é hipotético aqui**: `formataBrDuasCasasOuTraco`
  (`src/shared/decimal/index.ts:166-168`) devolve `-` para produção zero, e essa
  célula vai para a máquina do fiscal. Toda célula de texto é forçada como texto.
- **Metadados.** `creator` e `lastModifiedBy` são `'RDO digital'`, sem comentário
  de célula e sem nome de pessoa — a planilha legada vaza quatro nomes só nos
  metadados.

Nenhuma dependência nova: o `exceljs` já está no `package.json`, e o `xlsx`
continua proibido.

### 4.4 Nome do arquivo

`rdo-periodo-AAAA-MM-DD-a-AAAA-MM-DD.pdf` e `.xlsx`, do primeiro ao último dia do
conjunto. Deriva da decisão 17.3 e da mesma regra: ordena sozinho na pasta e
**nunca carrega nome de pessoa**, porque nome de arquivo circula em e-mail e em
WhatsApp. **Alternativa recusada:** enumerar os dias no nome — passa do limite de
caminho do Windows com poucas dezenas de dias.

### 4.5 A trilha (R20) — quem, quando, qual obra, **qual período**

`registro_exportacao` hoje tem um `data_rdo` só e `CHECK (formato = 'PDF')`
(`src/db/schema/exportacao.ts:33-40`). Precisa de migration, e migration é
arquivo compartilhado: **é do coordenador**, no passo zero.

Decidido: **uma linha por dia do conjunto**, todas com o mesmo `lote_id`, mais
`escopo IN ('diario','consolidado')` e `formato IN ('PDF','XLSX')`.

**Alternativa recusada:** uma linha com `data_inicial` e `data_final`. Recusada
porque mente quando o conjunto não é contíguo: exportar 02, 05 e 09 registraria
"02 a 09" e a trilha afirmaria que sete dias saíram. **Segunda alternativa
recusada:** uma linha com a lista de dias em JSON — bloco de texto não
consultável dentro de uma tabela de auditoria.

---

## 5. Onde cada frente mexe

### Passo zero: coordenador, sozinho, antes das frentes

Sem isto, as três frentes disputam os mesmos arquivos no primeiro dia:

1. `src/modules/rdo/periodo/tipos.ts` — o `RdoDePeriodo` da seção 2
2. `src/modules/rdo/periodo/portas.ts` — `PortasDoRdoDePeriodo` da seção 3
3. `src/modules/export/periodo/portas.ts` — `PacoteParaDocumento`,
   `RdoDePeriodoParaDocumento`, `ModoDeExportacaoDePeriodo`, o evento de trilha
4. `src/db/migrations/0004_exportacao_de_periodo.sql` — a trilha de 4.5
5. `CLAUDE.md` e `docs/prd/v1.md` — o escopo de DP1 a DP9

São **só tipos e migration**. Nenhuma regra de negócio: a regra é das frentes.

### As três frentes

| Frente | Nome    | Pastas e arquivos que **só ela** toca                                                                                                                                                                 |
| ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L**  | Leitura | `src/modules/lancamento/leitura-de-periodo.ts` · `src/modules/obra/periodos-bms.ts` · `src/modules/pessoal/**` e `src/modules/equipamento/**` se precisarem · `src/app/_composicao/rdo-de-periodo.ts` |
| **C**  | Cálculo | `src/modules/rdo/periodo/**` (menos os dois arquivos do passo zero) · `src/modules/rdo/borda/esquemas-de-periodo.ts` · `src/modules/rdo/borda/consulta-de-periodo.ts`                                 |
| **S**  | Saída   | `src/modules/export/periodo/**` (PDF e Excel, menos `portas.ts`) · `src/app/(rdo)/periodo/**` · `src/app/_composicao/exportacao-de-periodo.ts`                                                        |

Fronteiras disjuntas, verificáveis: nenhum caminho aparece em duas linhas.

Dependência de contrato, não de calendário: **L** produz funções com a forma das
portas da seção 3 sem importar o tipo (tipagem estrutural, conferida na raiz de
composição); **C** trabalha contra duplas em `src/modules/rdo/periodo/teste/`;
**S** trabalha contra um `PacoteParaDocumento` de teste. Nenhuma frente espera a
outra para começar.

### Arquivos compartilhados: perguntar antes de tocar

Além da lista de `docs/arquitetura/v1.md`, seção 6, **e com o mesmo peso**:

- `src/modules/rdo/tipos.ts`, `portas.ts`, `monta-rdo-diario.ts`, `producao.ts`,
  `efetivo.ts`, `para-documento.ts`, `limites.ts`, `numero-do-rdo.ts` — o diário
  entregue. Ler à vontade, importar à vontade dentro do módulo, **editar não**
- `src/modules/export/portas.ts` e `src/modules/export/documento/documento-rdo.tsx`
- `src/modules/export/documento/rotulos.ts` — ver seção 6
- os quatro arquivos do passo zero
- `package.json`, lockfile, `src/db/**`, `src/shared/**`, configuração, `.claude/**`

Precisou de algo do módulo alheio? Peça o contrato. Se a porta que você recebeu
não serve, a mudança é **neste documento primeiro**, depois no código.

---

## 6. O que **não** muda

1. **Nenhum rótulo novo.** `src/modules/export/documento/rotulos.ts:21-67` fica
   como está. O consolidado reusa `RDO Nº`, `BM'S`, `EXEC.`, `ACUM.`, `PROJETO`,
   `EFETIVO PESSOAL`, `EFETIVO EQUIPAMENTOS`, `ATIVIDADES`, `STATUS`,
   `PLUVIOMETRIA`, `COMENTÁRIOS CROS`, `COMENTÁRIO CONTRATANTE` e os dois de
   assinatura, com as grafias herdadas, erros inclusive.
2. **A ordem dos 11 blocos** é a mesma do diário.
3. **O diário existente não muda.** Se a implementação do período exigir uma linha
   em `monta-rdo-diario.ts`, `producao.ts`, `efetivo.ts`, `para-documento.ts` ou
   `documento-rdo.tsx`, o contrato desta seção está errado: volte aqui, não
   edite lá.
4. **R5 continua inteiro.** Não existe tabela de RDO de período, nem cache de
   média, nem coluna de total de mm. A trilha registra o **ato** de exportar, e
   não o documento.
5. **A borda continua como está**: `safeParse`, tipo de marca, teto de 366,
   mensagem em português, sem rastro de pilha, sem nome.

### O que o consolidado precisaria e o gabarito não tem — **[A APROVAR]**

Não inventei rótulo nenhum. Estes cinco pontos precisam de decisão de quem
responde pelo produto **antes** de a frente S desenhar o PDF:

| #   | Ponto                                                                                           | O que falta                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A1  | O campo da data, no bloco 2, passa a receber uma faixa (`02/09/2026 a 09/09/2026`)              | confirmar que a faixa ocupa o mesmo campo, sem rótulo novo          |
| A2  | O campo do **dia da semana** não tem sentido num conjunto                                       | sai vazio? sai a contagem de dias? precisa de rótulo?               |
| A3  | Os contadores de DP4 (`dias B`, `dias C`, `dias I`, `dias parados`) **não existem no gabarito** | quatro rótulos novos, com a grafia que o fiscal vai ler             |
| A4  | Os blocos de efetivo passam a exibir **média**, com casa decimal, onde havia contagem inteira   | o cabeçalho do bloco diz que é média? como?                         |
| A5  | Atividades e comentários passam a ser **agrupados por data**, e dia não lançado aparece marcado | como a data separa os grupos, e o que se escreve no dia não lançado |

Enquanto A1 a A5 não forem respondidos, a frente S entrega **a tela** e a
estrutura de dados do documento, e o PDF do consolidado fica parado. O que não
para: os modos 2 e 3 no que toca aos **diários anexados**, que usam o documento
já aprovado.

---

## 7. Decisões deste documento, com a alternativa recusada

| #   | Decisão                                                                                        | Alternativa recusada                                         | Por quê                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Pedido é `readonly DiaPuro[]` normalizado, não `{ inicial, final }`                            | intervalo, como `interpretaPedidoDePeriodo` já faz           | DP1. Com intervalo, somar o dia 03 num conjunto `{02,05,09}` é uma linha natural que ninguém pega na revisão                                           |
| 2   | Teto reaproveita `DIAS_MAXIMOS_DA_CONSULTA = 366`, contando cardinalidade                      | teto novo, menor, para o conjunto                            | dois tetos com o mesmo propósito divergem na terceira mudança. O motivo do teto é o mesmo: negação de serviço com sessão válida                        |
| 3   | Dia repetido é removido em silêncio; o conjunto normalizado volta no resultado                 | recusar o pedido com erro                                    | tocar duas vezes no mesmo RDO não é erro do usuário. O que não se admite é usar um conjunto diferente do que a tela mostra                             |
| 4   | Dia fora do contrato recusa o pedido **inteiro**                                               | filtrar os dias inválidos e seguir                           | filtrar dá um consolidado calculado sobre menos dias do que a pessoa escolheu, sem ela saber. Decisão 23.1 por dia, aplicada ao conjunto               |
| 5   | Portas plurais, que recebem o conjunto                                                         | `PortasDoRdo` chamada N vezes                                | instantâneo único (o consolidado não pode discordar dos diários que anexa); e ~4.000 consultas desfazem a defesa do teto                               |
| 6   | Diários anexados vêm de um `PortasDoRdo` **em memória**                                        | extrair um núcleo puro de `montaRdoDiario`                   | mexeria no diário entregue e coberto por fidelidade, para ganhar o que a porta em memória dá sem tocar nele                                            |
| 7   | Média com `mediaPorDia: Quantidade \| null`, mais `somaDoPeriodo` e `diasConsiderados` no tipo | só o número formatado                                        | média é o único valor do RDO que não leva de volta a um lançamento; os dois ingredientes ficam à vista e o teste refaz a conta                         |
| 8   | `mediaTotal` calculada sobre os totais diários                                                 | somar as médias já arredondadas das colunas                  | as duas são iguais na álgebra; forçar o total a bater com o arredondado é o defeito de planilha que não se herda                                       |
| 9   | Média divide com `Decimal` e materializa em milésimos                                          | `dividePorInteiro` novo em `src/shared/decimal/`             | evita mexer em `shared/**` no meio do trabalho paralelo. Se o coordenador preferir a função em `shared`, é troca de uma linha em um arquivo — ver PP-3 |
| 10  | Faixa de RDO por `min`/`max` dos números calculados                                            | `numero(primeiroDia) a numero(ultimoDia)`                    | o número congelado (6.2) pode não ser monótono se a data de início mudar depois de dias fechados; `min`/`max` está certo nos dois casos                |
| 11  | Modo é **parâmetro**, e o pacote é **união discriminada**                                      | três funções exportadas; ou objeto com dois campos anuláveis | três funções copiam três vezes "sem trilha não há exportação"; objeto anulável permite pacote vazio que compila                                        |
| 12  | Excel consome o `PacoteParaDocumento`, nunca `RdoDePeriodo`                                    | Excel lendo o domínio e formatando por conta                 | dois formatadores divergem, e o fiscal recebe dois números para o mesmo serviço                                                                        |
| 13  | Trilha com uma linha por dia, amarrada por `lote_id`                                           | uma linha com `data_inicial`/`data_final`; ou lista em JSON  | a faixa mente quando o conjunto não é contíguo; JSON em tabela de auditoria não se consulta                                                            |
| 14  | Pedido no corpo (Server Action / `POST`)                                                       | `GET` com `?dias=`                                           | 366 dias passam de 4.000 caracteres: `414`, log de acesso inteiro e quebra em proxy                                                                    |
| 15  | Consolidado sem campo `transbordo`; limites do diário não se aplicam                           | reusar `ATIVIDADES_NA_PAGINA_1 = 15` no consolidado          | 15 é o que cabe numa página de **um dia**; aplicá-lo a 30 dias seria truncamento silencioso do que o fiscal precisa ver                                |

---

## 8. Fronteiras de confiança do período

| Fronteira                 | Onde mora                                                           | O que vale                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegador → servidor      | `src/modules/rdo/borda/esquemas-de-periodo.ts`                      | seção 1.2, na ordem. Comprimento antes de conteúdo                                                                                                      |
| Perfil                    | `exigeAcessoNaObra` na rota, **mais** segunda camada no caso de uso | igual a `src/modules/export/exporta-rdo-diario-em-pdf.ts:62-68`. Consolidado e sua exportação exigem **engenheiro** — ver PP-1                          |
| Domínio → PDF e Excel     | a projeção, em `para-documento-de-periodo.ts`                       | sem nome de trabalhador (não existe no tipo), sem autor, sem aviso de tela. Efetivo agregado por função e por identificador, como sempre                |
| Domínio → log             | `ContextoDeLog`, sem mudança                                        | `{ obraId, usuarioId, quantidade: dias.length }`. O campo `quantidade` já existe (`src/shared/log/index.ts:46`). **A lista de dias não vai para o log** |
| Domínio → nome de arquivo | `export/periodo/nome-do-arquivo.ts`                                 | só datas e a palavra `rdo-periodo`. Nunca nome                                                                                                          |

---

## 9. Pontos de decisão pendentes, cada um num lugar só

| #    | Pergunta                                                            | Onde está isolado                               | Enquanto não há resposta                                                                                                 |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PP-1 | **O encarregado vê o consolidado?** DP1 a DP9 não dizem             | a ação protegida, num lugar só, e o caso de uso | **assumido que não**: só engenheiro, que é a regra da exportação (27.1). Abrir depois é uma linha; fechar depois é tarde |
| PP-2 | **Turno em branco na escolha da pior letra**                        | `periodo/letra-do-dia.ts`, uma função           | **assumido ignorar**; dia com três turnos em branco vai para `diasSemLeitura`                                            |
| PP-3 | **A divisão da média mora em `shared/decimal` ou no módulo `rdo`?** | `periodo/media.ts`                              | no módulo, para não tocar em `shared/**` durante o paralelo. É decisão do coordenador, não das frentes                   |
| PP-4 | **A1 a A5 da seção 6**, os rótulos que o gabarito não tem           | `export/periodo/` inteiro                       | o PDF do consolidado não é desenhado. Tela, cálculo e diários anexados seguem                                            |
| PP-5 | **O consolidado pode ser exportado com dias não lançados dentro?**  | `export/periodo/valida-antes-de-exportar.ts`    | **assumido que sim**, com aviso na tela — mesma postura de 12.1 e 21.1: avisa, não bloqueia                              |

---

## 10. Como conferir que este contrato não foi traído

Cinco verificações baratas, para o `revisor-codigo` e para o `qa-casos-teste`:

1. Nenhuma tabela nova cujo nome contenha `periodo` além de `periodo_bms`, e
   nenhuma coluna de média, total de mm ou acumulado.
2. `git diff` não toca os oito arquivos do diário listados na seção 5.
3. `src/modules/rdo/periodo/` não importa de `src/modules/export/`, nem o
   contrário, nem qualquer um dos dois de `src/db`.
4. `EXEC.` do período tem teste com conjunto **não contíguo** provando que o dia
   de fora não entra; `ACUM.` tem teste provando que o dia de fora **entra**.
5. A média tem teste com dia parado no conjunto (entra no divisor, soma zero) e
   com dia não lançado (fica fora do divisor). São as duas fronteiras de DP2.
