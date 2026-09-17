---
name: decisoes-de-seguranca-pendentes
description: Escolhas de seguranca sem decisao de produto registrada — sessao de 12h, retencao de rascunho, apagamento de pessoa e a leitura nominal pelo encarregado de 17/09
metadata:
  type: project
---

Levantadas nos laudos `docs/seguranca/2026-09-16-fatia-vertical-v1.md` e
`docs/seguranca/2026-09-17-periodo-e-perfis.md`. Nenhuma tem decisão de quem
responde pelo produto registrada com autor e data.

1. **Sessão de 12 h** (`src/modules/acesso/autenticacao.ts`, `HORAS_DE_SESSAO`).
   Absoluta, sem expiração por inatividade e sem renovação. **Ganhou peso em
   17/09** (item 4).
2. **Retenção do rascunho local.** Texto livre de atividade fica em
   `localStorage` em claro, sem prazo, apagado só no envio aceito.
3. **Apagamento/anonimização de pessoa.** Não existe caminho em `src/`. O RDO
   agrega por função, então anonimizar mantendo `pessoaId` não mudaria documento
   já entregue — mas ninguém decidiu isso. Mais urgente agora que N encarregados
   leem a lista nominal.
4. **Leitura nominal da lista de pessoal pelo encarregado** (17/09/2026,
   `_composicao/cadastro.ts`, `listaPessoalProtegida` passou a `'encarregado'`).
   Reverte o CT-034, que existia por LGPD. **A decisão é defensável e o código
   está certo** — ele convive com essas pessoas, precisa conferir mobilização, e
   a superfície não cresceu (RDO segue agregando por função). Falta: registrar a
   decisão em `docs/decisoes-do-rdo.md` com **quem** e **quando** — hoje ela só
   existe em comentário de teste e de página —, e decidir se **leitura** de
   lista nominal entra na trilha (exportação entra, leitura não).

**Resolvido desde 16/09:** o cadastro público de engenheiro foi removido
(decisão 25.1); a conta nasce por `npm run criar-engenheiro` ou por convite de
engenheiro. Não é mais pendência.

**Why:** frentes em paralelo produzem decisões de segurança onde o PRD é omisso.
As escolhas costumam ser defensáveis; o problema é não terem dono, porque achado
sem dono volta como novo a cada auditoria.

**How to apply:** não relatar nenhuma como descoberta nova — relatar como
pendente de decisão, citando este registro. Quando alguma for decidida, mover
para o histórico com quem decidiu e quando. Risco aceito precisa continuar
visível, não sumir. Ver [[invariantes-ja-provados]].
