---
name: decisoes-de-seguranca-pendentes
description: Quatro escolhas de seguranca tomadas por agente sem decisao de produto registrada — sessao de 12h, cadastro aberto de engenheiro, retencao de rascunho e apagamento de pessoa
metadata:
  type: project
---

Levantadas no laudo `docs/seguranca/2026-09-16-fatia-vertical-v1.md`. Nenhuma
tem decisão de quem responde pelo produto; todas foram escolhidas pela frente
que implementou.

1. **Sessão de 12 h** (`src/modules/acesso/autenticacao.ts`, constante
   `HORAS_DE_SESSAO`). O próprio código admite que não há decisão. É absoluta,
   sem expiração por inatividade e sem renovação.
2. **Cadastro aberto de engenheiro.** A página pública `/entrar` cria conta sem
   convite, e `exigePermissaoParaCriarObra` deixa qualquer conta sem acesso
   criar obra. Não dá acesso a obra alheia, mas é auto-atribuição de perfil.
   Sem limite de tentativas de entrada.
3. **Retenção do rascunho local.** Texto livre de atividade fica em
   `localStorage` em claro, sem prazo, apagado só no envio aceito.
4. **Apagamento/anonimização de pessoa.** Não existe caminho nenhum em `src/`.
   O RDO agrega por função, então anonimizar mantendo `pessoaId` não mudaria
   documento já entregue — mas ninguém decidiu isso.

**Why:** três frentes em paralelo produziram decisões de segurança onde o PRD
era omisso. As escolhas são defensáveis; o problema é não estarem registradas,
porque achado sem dono volta como novo a cada auditoria.

**How to apply:** não relatar nenhuma destas como descoberta nova — relatar como
pendente de decisão, citando este registro. Quando alguma for decidida, mover o
item para o histórico com quem decidiu e quando. Risco aceito precisa continuar
visível, não sumir. Ver [[fronteira-de-acesso-latente]].
