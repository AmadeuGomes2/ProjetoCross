---
name: frentes-paralelas-v1
description: Como a v1 foi construída — três agentes cegos um ao outro — e o que isso obriga a revisão a procurar
metadata:
  type: project
---

A fatia vertical da v1 (`d5dce94`, 16/09/2026) foi escrita por **três frentes em
paralelo que não podiam ver o código uma da outra**, cada uma contra duplas de
teste, mais um coordenador que integrou depois.

- Frente A: `acesso`, `obra`, `pessoal`, `equipamento`, `taxonomia`
- Frente B: `lancamento`
- Frente C: `rdo`, `export`

**Why:** trabalho cego contra dupla de teste produz módulos internamente corretos
e **contratos incompatíveis na costura**. Foi exatamente o que aconteceu: as
frentes A e C escreveram duas respostas diferentes para a mesma porta do RDO, e
nenhum dos comandos verdes (lint, typecheck, 468 testes, build) percebeu, porque
teste unitário usa dupla e ninguém cobre `src/app/_composicao/`.

**How to apply:** em qualquer revisão de trabalho paralelo neste repositório,
**comece pela raiz de composição**, não pelos módulos. Verifique, um a um: cada
porta declarada tem implementação real? Cada caso de uso exportado como "o que a
outra frente consome" é de fato consumido? Existe rota para cada saída que o
commit alega entregar? Só depois olhe o código dos módulos.

Fato declarado pela frente A e **conferido como verdadeiro** nesta revisão: ela
escreveu os módulos antes dos testes, mas as expectativas vêm de
`docs/qa/v1-casos-passos-1-3.md` e das decisões de 16/09/2026, citadas por número
nos comentários dos próprios testes. Não é fotografia do defeito.

Ver [[defeitos-recorrentes]].
