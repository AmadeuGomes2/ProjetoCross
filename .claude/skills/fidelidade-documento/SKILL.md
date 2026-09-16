---
name: fidelidade-documento
description: Gabarito do RDO diário — blocos, ordem, rótulos com grafia exata, unidades e totais que o PDF e o Excel gerados precisam reproduzir. Use ao gerar ou conferir qualquer exportação.
---

# Fidelidade do documento — gabarito do RDO diário

**Divergência de layout é defeito, não preferência.**

O RDO é documento contratual lido por um fiscal de prefeitura que já conhece o
formato há meses. Um documento que não parece um RDO gera pedido de correção,
atrasa medição e queima a confiança no sistema novo. A fidelidade não é estética:
é aceitação.

Gabarito visual: a planilha em `referencia/`, fora do repositório. Abra ao lado do
PDF gerado. Se não estiver lá, veja `referencia/README.md`.

---

## Ordem dos blocos, de cima para baixo

A ordem é obrigatória. É a ordem em que o fiscal lê.

1. Título
2. Data, dia da semana, BMS, número do RDO
3. Informações gerais
4. Características do projeto
5. Efetivo pessoal
6. Efetivo equipamentos
7. Produção controlada
8. Atividades do dia, com status
9. Pluviometria
10. Comentários
11. Assinaturas

Retrato, com margem que caiba em A4. **Uma página por dia é o normal**, mas o dia
que transborda o layout ganha uma **segunda página de continuação**, com o mesmo
cabeçalho de identificação. Decisão 11.1, aprovada em 16/09/2026.

Transbordo nunca é truncamento silencioso. Os limites que disparam continuação:
mais de 15 atividades, comentário com mais de 4 linhas, mais de 41 funções ou
mais de 41 equipamentos.

---

## Bloco a bloco

### 1. Título

Texto exato: `RELATÓRIO DIÁRIO DE OBRAS`. Caixa alta, centralizado, topo.

### 2. Cabeçalho de identificação

Canto superior direito, quatro campos:

| Campo         | Rótulo   | Conteúdo                                 |
| ------------- | -------- | ---------------------------------------- |
| data          | —        | `dd/mm/aaaa`                             |
| dia da semana | —        | por extenso, capitalizado: `Terça-Feira` |
| BMS           | `BM'S`   | número                                   |
| número do RDO | `RDO Nº` | inteiro                                  |

O rótulo do BMS é `BM'S`, com apóstrofo, exatamente assim.
O dia da semana é capitalizado com hífen: `Segunda-Feira`, `Sábado`, `Domingo`.

### 3. Informações gerais

Cabeçalho do bloco: `INFORMAÇÕES GERAIS`. Rótulos com os dois-pontos:

```
CONTRATO:       P0476/01-25 - BLOCO 02
DATA INICIO:    05/02/2026            <- sem acento em INICIO, como no original
DATA FINAL:     05/02/2027
CONTRATANTE:    PREFEITURA MUNICIPAL DE MONTES CLAROS - MG
CONTRATADA:     CROS CONSTRUÇÕES S.A.
ESCOPO:         EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO
```

### 4. Características do projeto

Cabeçalho: `CARACTERISTICAS DO PROJETO`, sem acento em CARACTERISTICAS.

```
NOME:   SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02
ÁREA:   MONTES CLAROS - MG
LOCAL:  VIAS URBANAS  DA CIDADE MONTES CLAROS - MG
```

Os espaços duplos em `PAVIMENTAÇÃO  - BLOCO` e `URBANAS  DA CIDADE` existem no
original.

### 5. Efetivo pessoal

Cabeçalho: `EFETIVO PESSOAL`. Tabela de duas linhas mais total:

- linha de cima: nome da **função**, uma por coluna;
- linha de baixo: a quantidade;
- coluna final rotulada `TOTAL`, com a soma.

**Agrega por função, nunca por nome.** Nome de trabalhador não aparece no
documento. É requisito de LGPD, não escolha de layout.
Quantidade zero é exibida em branco, não como `0`.

**Em dia parado o efetivo sai zerado**, e portanto o bloco inteiro sai em branco
com `TOTAL` zero. Decisão 5.1, aprovada em 16/09/2026. O efetivo é o mobilizado,
não a presença marcada dia a dia.

### 6. Efetivo equipamentos

Cabeçalho: `EFETIVO EQUIPAMENTOS`, no plural. Mesmo formato, mas a linha de cima
traz o **identificador** do equipamento (`CF-29`, `RE-17`), não o tipo.
Coluna final `TOTAL`.

### 7. Produção controlada

Cabeçalho: `PRODUÇÃO CONTROLADA`. Quatro colunas, nesta ordem, com estes rótulos:

| `SERVIÇO` | `EXEC.` | `ACUM.` | `PROJETO` | barra de percentual |
| --------- | ------- | ------- | --------- | ------------------- |

- `EXEC.` e `ACUM.` com ponto final, abreviados assim mesmo.
- Uma linha por serviço controlado, sempre as quatro, mesmo zeradas.
- Número com duas casas decimais e separador de milhar brasileiro: `15.027,03`.
- **Valor zero sai como `-`, um traço**, não como `0,00` nem em branco. É o que o
  formato numérico da célula produz na planilha. Decisão 17.2, aprovada em
  16/09/2026.
- O percentual é uma **barra de progresso**, não um número solto.

### 8. Atividades do dia

Cabeçalho do bloco à esquerda: `ATIVIDADES`. À direita: `STATUS`.
Uma linha por atividade, descrição à esquerda e status à direita.

Espaço para **15 atividades**. Acima disso, segunda página de continuação, nunca
corte silencioso.

**Dia parado** não tem atividade nenhuma. O bloco mostra, na **primeira linha**, o
motivo da parada, e o complemento em texto livre se houver. É assim que o fiscal
está acostumado a ler o dia sem trabalho, porque a planilha escrevia "Não houve
atividades - Domingo" nesta mesma posição. Decisão 4.1, aprovada em 16/09/2026.

### 9. Pluviometria

Cabeçalho: `PLUVIOMETRIA`. Quatro campos empilhados, com estes rótulos:

```
NOITE ANTER          <- abreviado assim, sem ponto
MANHÃ
TARDE
INDICE               <- sem acento
```

Os três turnos mostram **a letra**, `B`, `C` ou `I`, e não a palavra por extenso.
A fórmula da planilha copia o valor da célula do turno sem traduzir, então é a
letra que o fiscal lê há meses. Decisão 2.3, aprovada em 16/09/2026.
O índice é exibido com o sufixo ` mm`.

Turno em branco é válido: sai vazio, não `-` nem `0`.

### 10. Comentários

Duas colunas, nesta ordem:

```
COMENTÁRIOS CROS          <- plural, contratada
COMENTÁRIO CONTRATANTE    <- singular, contratante
```

**Cada bloco lê a sua própria fonte.** Na planilha legada o bloco da CROS lê a aba
do contratante, e por isso nunca mostrou nada. Reproduzir esse defeito é falha de
fidelidade, não fidelidade. Ver `docs/dominio/regras-extraidas.md`, seção 8.

Na v1, `COMENTÁRIO CONTRATANTE` **sai sempre vazio**: o bloco aparece, o conteúdo
não existe, porque o fluxo do contratante está fora do escopo. Decisão 10.1,
aprovada em 16/09/2026. Bloco ausente continua sendo falha crítica; bloco vazio,
não.

### 11. Assinaturas

Rodapé, dois campos lado a lado:

```
REPRESENTANTE CROS CONSTRUÇÕES S/A        REPRESENTANTE CONTRATANTE
```

À esquerda, acima da linha, os dados do engenheiro responsável: nome, titulação e
registro (`Engenheiro Civil`, `CREA - MG 212333/D`).

---

## Fora do documento

Duas coisas decididas em 16/09/2026 que não são bloco do PDF, mas entram na
conferência:

- **Nome do arquivo:** `rdo-AAAA-MM-DD-nNNN.pdf`, com a data e o número do RDO,
  por exemplo `rdo-2026-09-01-n208.pdf`. Sem nome de pessoa, nunca. Decisão 17.3.
- **Resumo do dia** (`Trabalhado`, `Perca de produção`, `Impraticavél`) aparece
  **na tela** do RDO diário e **não** no PDF, porque o gabarito não tem esse
  campo. Decisão 3.3. Se aparecer no PDF, é divergência.

## O que conferir, em ordem de gravidade

| Gravidade      | O que                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| **CRÍTICO**    | bloco faltando; bloco fora de ordem; total errado; nome de trabalhador aparecendo; bloco lendo a fonte errada |
| **CRÍTICO**    | número com separador errado, `15,027.03` no lugar de `15.027,03`                                              |
| **CRÍTICO**    | data em `mm/dd`                                                                                               |
| **ATENÇÃO**    | rótulo com grafia diferente do gabarito; unidade faltando; zero exibido onde o original deixa em branco       |
| **ATENÇÃO**    | transbordo truncando sem aviso                                                                                |
| **OBSERVAÇÃO** | diferença de fonte, espessura de borda, alinhamento fino                                                      |

---

## Grafias herdadas, que NÃO se corrigem

Estes erros de ortografia estão no documento que o fiscal lê há meses. Mudá-los
sem aprovação é divergência:

| No documento                 | "Correto" em português |
| ---------------------------- | ---------------------- |
| `Perca de produção`          | Perda de produção      |
| `Impraticavél`               | Impraticável           |
| `INDICE ACUMUALDO`           | Índice acumulado       |
| `CARACTERISTICAS DO PROJETO` | Características        |
| `DATA INICIO`                | Data início            |
| `Base Concluida`             | Concluída              |
| `NOITE ANTER`                | Noite anterior         |

Espaços sobrando **no fim** de textos fixos (`MONTES CLAROS - MG `) são
**normalizados**: o documento gerado não os reproduz. São resto de digitação, não
vocabulário. Decisão 17.1, aprovada em 16/09/2026, que responde a nota de
fidelidade da dúvida 10.

Atenção à diferença: espaço **no meio** do texto continua sendo reproduzido, por
exemplo o duplo em `PAVIMENTAÇÃO  - BLOCO 02` e em `URBANAS  DA CIDADE`. A
decisão 17.1 vale só para as pontas.

---

## Como reportar

O agente `fidelidade-documento` **reporta, não corrige**.

```markdown
# Conferência de fidelidade — RDO <data>

Gerado: <caminho do PDF> · Gabarito: referencia/<arquivo>, aba <n>

## Conferido

<lista dos 11 blocos, com o veredito de cada um>

## Divergências

### CRÍTICO — Bloco de produção sem a coluna ACUM.

- Onde: src/modules/export/pdf/bloco-producao.tsx:41
- Gabarito: quatro colunas, SERVIÇO / EXEC. / ACUM. / PROJETO
- Gerado: três colunas, sem ACUM.
- Efeito: o fiscal perde o acumulado, que é a base da medição

## Não conferido e por quê
```
