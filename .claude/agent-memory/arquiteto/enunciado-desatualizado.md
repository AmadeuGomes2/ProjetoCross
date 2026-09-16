---
name: enunciado-desatualizado
description: Dois pontos do enunciado do agente arquiteto ficaram para trás das decisões de 16/09/2026 — não trate como pendência o que já foi respondido
metadata:
  type: project
---

O enunciado do agente `arquiteto` diz que "o critério do dia da saída está
pendente, dúvida 5". **Não está.** Foi respondido em 16/09/2026 pela decisão
1.1: a pessoa **conta** no dia da saída (`saida >= dia`), e a 1.2 estende a
mesma regra ao equipamento.

**Why:** o enunciado foi escrito antes da rodada de decisões; tratar uma decisão
fechada como pendência faria eu devolver pergunta em vez de modelo, e o PRD é
explícito em que decisão tomada não se reabre.

**How to apply:** o ponto continua **isolado** numa função só
(`shared/date/intervalo.ts`, `intervaloCobreODia`), que era o pedido real do
enunciado — o valor de hoje é `>=`, e mudar custa uma linha. O mesmo vale para
a taxonomia "condição de tempo", que o enunciado ainda supõe existir: ela foi
eliminada pela decisão 2.1 e não entra em modelo nenhum.

Antes de confiar no enunciado sobre o que está pendente, confira
`docs/prd/v1.md` (seção DECISÕES TOMADAS) e `docs/dominio/duvidas.md`, que
marcam cada dúvida com RESPONDIDA ou PENDENTE e a data.
