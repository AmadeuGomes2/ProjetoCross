---
name: template-prd
description: Formato do PRD deste projeto, com PERGUNTAS ABERTAS no topo e critérios de aceite em Gherkin. Use ao escrever ou revisar qualquer documento em docs/prd/.
---

# Template de PRD — RDO digital

PRD fica em `docs/prd/NNN-nome-curto.md`, numerado em sequência.

## A regra que manda nas outras

**Ambiguidade vai para PERGUNTAS ABERTAS. Nunca vira decisão.**

Quando faltar informação, escreva a pergunta. Não preencha com o que parece
razoável, não escreva "presumo que", não escolha um padrão e siga. Uma pergunta
aberta custa uma frase; uma suposição errada custa a funcionalidade inteira e só
aparece quando o fiscal recusa o documento.

A seção vai **no topo**, antes de tudo, porque é o que o leitor precisa decidir
antes de ler o resto. PRD sem perguntas abertas na primeira versão é suspeito:
significa que alguém decidiu sozinho.

Antes de escrever, leia `docs/dominio/duvidas.md`. Se a sua pergunta já está lá,
referencie em vez de repetir.

---

## Estrutura

````markdown
# PRD NNN — <título>

Status: rascunho | em revisão | aprovado
Autor: <agente ou pessoa> · Data: AAAA-MM-DD
Relacionado: docs/spec.md, docs/dominio/<arquivos>

## PERGUNTAS ABERTAS

> Bloqueiam a implementação. Nenhuma foi respondida por conta própria.

1. **<pergunta direta, uma frase>**
   - Por que importa: <o que muda no produto conforme a resposta>
   - Opções que enxergo: <a>, <b>. Não escolhi.
   - Bloqueia: <qual critério de aceite abaixo depende disto>

2. ...

_Se não houver nenhuma, escreva: "Nenhuma. Todas as decisões vieram de
docs/spec.md ou de resposta registrada." E espere que perguntem por quê._

## Problema

Quem sofre, com que frequência, e o que custa hoje. Com número quando houver.
Nada de "melhorar a experiência".

## Quem usa

Engenheiro responsável, encarregado de obra, ou os dois. O que cada um faz nesta
funcionalidade. Se um dos dois não pode fazer algo, diga aqui — é requisito de
controle de acesso, não detalhe de tela.

## Fora do escopo

O que esta entrega **não** faz, principalmente o que um leitor razoável assumiria
que ela faz. Confira contra a lista de fora do escopo da v1 em `CLAUDE.md`.

## Regras de negócio

Em português, numeradas, com a origem. Quando vier da planilha legada, cite
`docs/dominio/regras-extraidas.md` e a seção. Quando for nova, marque **[NOVA]**,
porque regra nova precisa de dono.

## Critérios de aceite

Em Gherkin, em português. Um cenário por comportamento observável.

```gherkin
Funcionalidade: Efetivo de pessoal no RDO diário

  Contexto:
    Dado uma obra com início em 05/02/2026
    E uma pessoa "P1" com função "Motorista" e entrada em 10/02/2026

  Cenário: pessoa sem saída conta nos dias seguintes à entrada
    Quando o RDO de 11/02/2026 é gerado
    Então o efetivo da função "Motorista" é 1

  Cenário: pessoa não conta antes da entrada
    Quando o RDO de 09/02/2026 é gerado
    Então o efetivo da função "Motorista" é 0

  Cenário: pessoa com saída no próprio dia consultado
    Dado que "P1" tem saída em 20/02/2026
    Quando o RDO de 20/02/2026 é gerado
    Então o efetivo da função "Motorista" é <PERGUNTA ABERTA 1>
```

Marcar o valor esperado como pergunta aberta é permitido e preferível a chutar.

Regras do Gherkin aqui:

- **Dado** é estado, **Quando** é a ação única, **Então** é o observável.
- Um **Quando** por cenário. Dois indicam dois cenários.
- Valor concreto, nunca "um valor válido".
- Inclua sempre a fronteira: o dia da entrada, o dia da saída, zero, o limite de
  15 atividades, o índice pluviométrico exatamente 10.
- Inclua o caminho infeliz: o que acontece quando o dado está errado.

## Casos de teste

Não liste casos aqui. Aponte para o arquivo gerado pela skill
`template-caso-teste`, que deriva a matriz destes critérios.

## Impacto em dado pessoal

Esta entrega toca nome de trabalhador, função, CREA, ou exporta algo? Se sim, o
que aparece onde, e quem pode ver. Se não, escreva "não toca" — a ausência da
seção não conta como resposta.

## Impacto no documento

Muda alguma coisa no PDF do RDO? Se sim, qual bloco, e por quê. Lembre que
divergência de layout é defeito. Ver a skill `fidelidade-documento`.

## Como saberemos que funcionou

Dois ou três sinais verificáveis, do ponto de vista de quem usa.
````

---

## Erros que invalidam o PRD

- Pergunta aberta respondida pelo próprio autor. É o erro mais grave.
- Critério de aceite sem valor concreto.
- Critério que descreve a tela em vez do comportamento.
- Cenário só de caminho feliz.
- Regra de negócio sem origem citada.
- Escopo que cresce no meio do documento, sem aparecer em Fora do escopo.
