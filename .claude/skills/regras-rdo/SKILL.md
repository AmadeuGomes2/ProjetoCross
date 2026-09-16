---
name: regras-rdo
description: As regras de cálculo do RDO em formato consultável — efetivo, produção acumulada, número do RDO, resumo pluviométrico, taxonomias e limites de página. Use ao implementar ou revisar qualquer cálculo do RDO digital.
---

# Regras do RDO — referência rápida

Versão consultável de `docs/dominio/regras-extraidas.md`. O documento longo tem a
origem e o raciocínio; aqui está o que você precisa para escrever o cálculo.

Convenção: **[HERDAR]** vale para o produto novo. **[NÃO HERDAR]** é defeito da
planilha. **[PENDENTE]** depende de decisão registrada em
`docs/dominio/duvidas.md` — não escolha por conta própria.

---

## 1. Efetivo do dia

```
efetivo(funcao, dia) =
    pessoas com essa funcao cuja ENTRADA <= dia
  − pessoas com essa funcao que ja sairam antes/ate o dia   <-- [PENDENTE]
```

- **[HERDAR]** presença é derivada do intervalo, não marcada por dia.
- **[HERDAR]** pessoal agrega por **função**; equipamento agrega por
  **identificador**. Duas granularidades diferentes, de propósito.
- **[PENDENTE, dúvida 5]** a pessoa conta no dia da saída? A planilha responde das
  duas formas: `≤` nas colunas B:S e `<` em T:AP. Equipamento usa `<` em todas.
- **[NÃO HERDAR]** o critério depender da coluna. Uma regra só, testada.
- **[PENDENTE, dúvida 11]** efetivo mobilizado ou efetivo presente? Hoje o RDO
  mostra 19 pessoas inclusive em domingo com a obra parada.
- **Atenção ao modelo:** intervalo único não suporta pessoa que sai e volta. Duas
  linhas seriam contadas como duas pessoas. Caso de teste 8.

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
- **[PENDENTE, dúvida 12]** o primeiro dia é RDO 0 ou RDO 1? Hoje é 0.
- **[PENDENTE, dúvida 12]** congelar no fechamento? Hoje, mudar a data de início
  renumera retroativamente tudo que já foi entregue.

## 4. Resumo do dia da pluviometria

Três turnos: noite anterior, manhã, tarde. Cada um recebe `B` bom, `C` chuva ou
`I` impraticável. Mais um índice em mm.

Árvore da planilha, na ordem, parando na primeira verdadeira:

```
1. tres letras B                      -> "Trabalhado"
2. existe C  e  indice <  10          -> "Trabalhado"
3. existe C  e  indice >  10          -> "Perca de producao"
4. existe I                           -> "Impraticavel"
5. caso contrario                     -> vazio
```

- **[NÃO HERDAR] o índice exatamente 10 não satisfaz o passo 2 nem o 3.** Cai no
  4, não tem `I`, e o dia sai **vazio**. Caso de teste 3, obrigatório.
- **[PENDENTE]** para que lado vai o 10.
- **[HERDAR]** as grafias exibidas: `Perca de produção`, `Impraticavél`. São o
  vocabulário do cliente, erros de ortografia incluídos.
- **[HERDAR]** o acumulado de chuva zera a cada mês.
- **[NÃO HERDAR]** comparar termo por igualdade exata. No Excel a comparação
  ignora maiúsculas e `Perca de Produção` casa com `Perca de produção`. Em código,
  não casa. Caso de teste 13.
- A macro VBA pinta uma quarta letra, `N`, que a árvore não conhece.

## 5. Dia sem trabalho

- **[NÃO HERDAR]** transformar dia parado em atividade com texto "Não houve
  atividades" e status `Produção`. São 79 linhas assim na planilha.
- O dia tem **estado próprio**: trabalhado ou parado, com motivo tipado.
- Dia parado tem zero atividades. Caso de teste 4.

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
- **[PENDENTE, dúvida 2]** qual é o ciclo. A tabela legada usa 16 a 15 e vai de
  2022 a 2025; as abas de RDO dizem BMS 7 para setembro de 2026; os títulos falam
  em 05/02 a 28/02. Nada fecha.

---

## Taxonomias, com a grafia exata

**Status de atividade** (14; só 8 já foram usados):
`Produção`, `Informativo`, `Pendências - Cliente`, `Pendências - CROS`,
`Mobilização`, `Desmobilização`, `Alterações - Cliente`, `Fornecimento`,
`Removido/Alteração`, `Serviço Fo. Es.`, `Paralisação`, `Transporte`, `Limpeza`,
`Levantamento`.

**Condição de tempo** (6): `Bom`, `Nublado`, `Chuvoso`, `Chuva Parcial`,
`Impraticável`, `---`.

**Turno de pluviometria** (3): `B`, `C`, `I`.

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
