---
name: fronteira-de-acesso-latente
description: Historico do furo de acesso de (rdo) e (lancamento) — fechado em 17/09/2026 — e o padrao de codigo que o produziu, que continua valendo como alerta
metadata:
  type: project
---

**Estado: fechado em 2026-09-17.** Mantido porque o _padrão_ que produziu o furo
não foi eliminado, só corrigido nos dois pontos onde apareceu.

## O que era, e o que aconteceu

Auditoria de 2026-09-16 (`d5dce94`) achou dois CRÍTICOS de mesmo formato:
`src/app/(rdo)/rdo/[obraId]/[dia]/page.tsx` não autenticava nada, e
`src/app/(lancamento)/_dados.ts` conferia só que existia sessão. Os dois
nasceram de um padrão, não de descuido: casos de uso de **leitura** recebem
`(obraId, data)` sem ator e delegam a autorização a quem chama, enquanto as
escritas recebem `Ator` e autorizam sozinhas.

Em 2026-09-17 (verificado no laudo `docs/seguranca/2026-09-17-periodo-e-perfis.md`):

- a página do RDO autentica e chama `consultaRdoProtegida`;
- `rotas-protegidas.test.ts` foi reescrito e **deixou de passar a vazio**: varre
  `page.tsx`, `route.ts` e todo arquivo com `'use server'`, e afirma primeiro o
  **tamanho** do que encontrou. As marcas aceitas são `comAtorNaObra`,
  `exigeAcessoNaObra` e o sufixo `Protegid`.

**How to apply:** o guardião prova que **algo** autoriza, nunca **qual perfil**.
Quem prova o perfil é `test/permissoes-por-perfil.test.ts`, uma linha por par
(operação, perfil) — e trocar uma palavra em `_composicao/cadastro.ts` passa no
guardião, no `typecheck` e no lint. Ao auditar, leia os dois. E ao ver caso de
uso de leitura sem `Ator` na assinatura, procure o chamador antes de dar por
verificado: é a assinatura que convida ao furo, e ela continua assim.

Ver [[dupla-validacao-e-borda-morta]] e [[invariantes-ja-provados]].
