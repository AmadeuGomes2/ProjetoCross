---
name: template-caso-teste
description: Matriz critério de aceite para caso de teste, com a regra de que a expectativa vem da regra de negócio e nunca da implementação. Use ao derivar casos de teste no RDO digital.
---

# Template de caso de teste — RDO digital

Casos ficam em `docs/qa/NNN-<nome-do-prd>.md`, com o mesmo número do PRD.

---

## A regra inegociável

**A expectativa vem da regra de negócio. NUNCA é lida da implementação.**

Proibido, sempre:

- rodar o código, ver o que dá e escrever aquilo como esperado;
- abrir a função e copiar a condição dela para o teste;
- ajustar o valor esperado até o teste passar;
- escrever o teste depois do código "só para confirmar".

Um teste assim não testa nada: ele fotografa o comportamento atual, inclusive os
defeitos, e depois impede a correção. A planilha legada é a prova viva. Se alguém
tivesse testado o resumo do dia lendo a fórmula, teria escrito que chuva com 10 mm
resulta em vazio, e o buraco estaria congelado como comportamento correto.

Cada caso declara de onde veio a expectativa, num destes três:

| Origem                    | Como citar                                                    |
| ------------------------- | ------------------------------------------------------------- |
| Critério de aceite do PRD | `PRD 003, cenário "pessoa com saída no próprio dia"`          |
| Regra extraída do domínio | `docs/dominio/regras-extraidas.md, seção 4`                   |
| Decisão registrada        | `docs/dominio/duvidas.md, dúvida 5, respondida em AAAA-MM-DD` |

**Se a expectativa não couber em nenhuma das três, o caso não pode ser escrito.**
Registre como pergunta aberta e pare. Caso de teste com expectativa inventada é
pior que caso de teste faltando, porque parece cobertura.

---

## Matriz critério → caso

Um critério gera vários casos. A matriz mostra a cobertura e o que ficou de fora.

```markdown
## Matriz

| #   | Critério de aceite (PRD NNN) | Caso de teste                      | Tipo      | Origem da expectativa             | Arquivo           |
| --- | ---------------------------- | ---------------------------------- | --------- | --------------------------------- | ----------------- |
| 1   | CA-01 pessoa sem saída conta | entrada anterior ao dia consultado | feliz     | regras-extraidas §1               | `efetivo.test.ts` |
| 2   | CA-01                        | dia exatamente igual à entrada     | fronteira | regras-extraidas §1               | `efetivo.test.ts` |
| 3   | CA-01                        | dia anterior à entrada             | negativo  | regras-extraidas §1               | `efetivo.test.ts` |
| 4   | CA-02 pessoa com saída       | saída no próprio dia consultado    | fronteira | **PENDENTE, dúvida 5**            | —                 |
| 5   | CA-02                        | saída anterior à entrada           | inválido  | regras-extraidas §10 por analogia | `efetivo.test.ts` |
```

Cobertura mínima por critério: um caminho feliz, **toda fronteira**, um caminho
negativo e uma entrada inválida. Critério que só tem caminho feliz está
incompleto.

Ao fim da matriz, duas listas curtas e obrigatórias:

- **Não coberto e por quê.** Ex.: "concorrência entre dois encarregados, depende
  da decisão de fechamento do dia".
- **Perguntas abertas que bloqueiam casos.** Com o número da pergunta.

---

## Formato do caso

```markdown
### CT-004 — Pessoa com saída no próprio dia consultado

- **Critério:** CA-02 do PRD 003
- **Tipo:** fronteira
- **Origem da expectativa:** docs/dominio/duvidas.md, dúvida 5 — PENDENTE
- **Por que existe:** a planilha legada responde das duas formas ao mesmo tempo,
  `≤` nas colunas B:S e `<` em T:AP. Ver regras-extraidas §1.1. Qualquer que seja
  a decisão, ela precisa estar travada por teste.

**Dado**
obra iniciada em 05/02/2026
pessoa "P1", função "Motorista", entrada 10/02/2026, saída 20/02/2026

**Quando**
o efetivo do dia 20/02/2026 é calculado

**Então**
o efetivo da função "Motorista" é <definir com a dúvida 5>

**Status:** bloqueado
```

Caso bloqueado fica na matriz, visível. Não some.

---

## Casos obrigatórios deste domínio

Vêm das inconsistências reais da planilha, em
`docs/dominio/inconsistencias.md`. Todo PRD que toque a área correspondente
precisa cobrir o caso, e nenhuma entrega fecha sem eles:

| #   | Caso                                                 | Por que                                          |
| --- | ---------------------------------------------------- | ------------------------------------------------ |
| 1   | pessoa com saída no próprio dia consultado           | a planilha faz dos dois jeitos; `≤` contra `<`   |
| 2   | pessoa com saída anterior à entrada                  | existe período negativo real na planilha         |
| 3   | índice pluviométrico exatamente 10                   | a árvore de decisão não cobre o valor            |
| 4   | dia sem atividade nenhuma                            | hoje vira atividade falsa com status Produção    |
| 5   | dia com produção lançada e nenhuma atividade         | 27/03/2026 é assim no arquivo real               |
| 6   | produção acumulada maior que a de projeto            | não há limite superior nem alerta                |
| 7   | atividade sem status                                 | 3 linhas reais estão assim                       |
| 8   | equipamento com saída e nova entrada depois          | o modelo de intervalo único quebra               |
| 9   | obra com data final anterior à inicial               | o BMS 4 tem -716 dias                            |
| 10  | mês de 30 dias e mês de 28 dias                      | a aba 31 gera 1º de outubro                      |
| 11  | dois lançamentos do mesmo dia por pessoas diferentes | não há autoria nem fechamento                    |
| 12  | mês do cabeçalho diferente do mês consultado         | a pluviometria está em julho num RDO de setembro |
| 13  | termo de taxonomia com caixa e espaço divergentes    | `Perca de Produção` contra `Perca de produção`   |
| 14  | registro sem data                                    | a linha 509 é órfã                               |
| 15  | data exibida em pt-BR e armazenada com fuso definido | três formatos convivem na planilha               |

---

## Do caso para o teste automatizado

- Nome do teste = o caso, em português: `it('nao conta a pessoa antes da data de
entrada', ...)`.
- Um caso, um teste. Nada de um teste com cinco asserções de coisas diferentes.
- Comentário no topo do arquivo citando o PRD e a seção de regra.
- Valor de fronteira é teste próprio, nunca uma linha a mais num loop de casos.
- Sem rede, sem relógio real, sem sistema de arquivos. Injete a data de referência.

Ao entregar, cole a saída real do `npm run test`. Sem a saída, não está pronto.
Ver `CLAUDE.md`, Definition of Done.
