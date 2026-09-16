---
name: fronteira-de-acesso-latente
description: Os grupos de rota (lancamento) e (rdo) nunca verificaram acesso por obra; a falha fica escondida atras de portas em stub e o teste-guardiao passa a vazio
metadata:
  type: project
---

Auditoria de 2026-09-16 (commit `d5dce94`) achou dois CRÍTICOS de mesmo formato:
`src/app/(rdo)/rdo/[obraId]/[dia]/page.tsx` não autentica nada, e
`src/app/(lancamento)/_dados.ts` confere só que existe sessão, nunca
`exigeAcessoNaObra(ator, obraId, ...)`. O grupo `(cadastro)` está correto nas 8
páginas — o furo é só nesses dois grupos.

**Why:** os dois nasceram de um padrão, não de descuido. (a) Os casos de uso de
**leitura** de `lancamento` recebem `(obraId, data)` sem ator e delegam a
autorização a quem chama — as escritas recebem `Ator` e autorizam sozinhas. (b)
As portas de dado de `(rdo)` e `(lancamento)` são recusas fixas, então tudo
falha fechado hoje e nenhum teste fica vermelho. (c) O teste-guardião
`src/modules/acesso/rotas-protegidas.test.ts` varre `route.ts`, e o projeto não
tem nenhum: a asserção é `expect([]).toEqual([])`. A superfície real é
`page.tsx` e arquivos `'use server'`.

**How to apply:** em qualquer auditoria futura, (1) não aceite "o teste de rotas
protegidas passa" como prova — confirme o que ele varre; (2) trate porta em
stub como falha latente e não como falha fechada, e confira se a documentação de
ligação (ex.: a tabela em `src/app/_composicao/rdo-diario.ts`) lista a
verificação de acesso entre os passos; (3) ao ver caso de uso de leitura sem
`Ator` na assinatura, procure o chamador antes de dar por verificado. A ligação
das portas da frente A é o momento de re-auditar — a assinatura de
`PortasDoLancamento['exigeAcessoNaObra']` (recebe ação) nem bate com
`acesso.exigeAcessoNaObra` (recebe perfil mínimo), então há um adaptador a
escrever. Ver [[decisoes-de-seguranca-pendentes]].
