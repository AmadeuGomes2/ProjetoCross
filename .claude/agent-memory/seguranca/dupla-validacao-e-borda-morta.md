---
name: dupla-validacao-e-borda-morta
description: A mesma entrada e validada em dois lugares no projeto — a borda do modulo e a composicao — e a borda boa costuma ficar sem chamador; achado ATENCAO 1 de 17/09/2026
metadata:
  type: project
---

Achado no laudo `docs/seguranca/2026-09-17-periodo-e-perfis.md`, ATENÇÃO 1.

O conjunto de dias da exportação de período tem **duas** validações:

1. `src/modules/rdo/borda/esquemas-de-periodo.ts`,
   `interpretaPedidoDeRdoDePeriodo` — confere o **comprimento antes de olhar
   item nenhum**, com teto `DIAS_MAXIMOS_DA_CONSULTA = 366`
   (`src/modules/rdo/borda/esquemas.ts:76`). Tem teste próprio. É a boa;
2. `src/app/_composicao/exportacao-de-periodo.ts`, `leiaPedidoDeExportacao` — é
   a que a rota `POST /rdo/<obra>/periodo` realmente usa, e **não tem teto
   nenhum**.

A borda boa só é chamada por `src/modules/rdo/borda/consulta-de-periodo.ts`,
que **não tem chamador nenhum**. Código morto guardando a defesa enquanto o
caminho vivo usa outra mais fraca.

**Why:** o projeto separa borda de módulo de raiz de composição de propósito
(módulo não importa de módulo). Quando a composição precisa validar e não pode
importar a borda com conforto, ela reimplementa — e a cópia nasce sem os
detalhes que só existem por causa de um incidente, como "comprimento antes do
item". Não é descuido de uma pessoa; é a forma da arquitetura empurrando.

**How to apply:** em toda auditoria, ao ver validação de entrada em
`src/app/_composicao/`, **procure se o módulo já tem uma borda para a mesma
entrada** e compare as duas listas de conferências. Grepe o chamador da borda do
módulo: borda sem chamador é sinal de que a composição reimplementou. Vale para
`esquemas.ts`, `esquemas-de-periodo.ts` e qualquer `borda/` nova.
Ver [[invariantes-ja-provados]].
