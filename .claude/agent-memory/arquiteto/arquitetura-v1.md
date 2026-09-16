---
name: arquitetura-v1
description: Estado da arquitetura da v1 em 16/09/2026 — o que já decidi, e as quatro divergências que esperam aprovação de quem coordena
metadata:
  type: project
---

Escrevi `docs/arquitetura/v1.md` em 16/09/2026: 22 tabelas, 8 módulos, 3 frentes.
As 42 decisões de produto do PRD estão fechadas e não se reabrem.

**Why:** o PRD entregou o modelo conceitual (L/D/M) e deixou o físico e o
contrato entre módulos para mim; sem isso as três frentes produziriam duas
verdades.

**How to apply:** antes de decidir qualquer coisa nova, leia a seção 7 (decisões
com alternativa recusada) e a 8 (P1 a P10) do documento. Não redecida o que já
está lá; se mudar de ideia, registre a mudança **e** o motivo no mesmo lugar.

Quatro pontos **não** são decisão minha fechada — dependem de aprovação e podem
voltar:

1. **Letra de turno não virou tabela** (decisão 5 / P6), contra o que o PRD
   sugeria: virou `CHECK` + união literal, porque acrescentar letra muda a
   árvore do resumo do dia. É divergência declarada do PRD.
2. **Dois módulos além dos seis de `padroes-codigo`**: `acesso` e `taxonomia`.
   Muda uma linha da skill, que é arquivo compartilhado.
3. **`src/app/_composicao/`** como raiz de composição (pasta `_` não vira rota).
4. **Pendências de produto P1 a P10**, com destaque para P1 (ninguém decidiu
   como o **engenheiro** autentica — o PRD só resolveu o link do encarregado) e
   P10 (o próprio PRD se contradiz em `docs/prd/v1.md:841`, que ainda pede
   complemento do motivo `Outro` removido pela decisão 20.1).

Estado do repositório quando escrevi: `src/` tinha só `app/layout.tsx` e
`app/page.tsx`, e **nenhuma** das dependências da stack decidida (drizzle,
better-sqlite3, zod, decimal.js, @react-pdf/renderer) estava em `package.json`.
Confirme antes de assumir que a fundação existe.
