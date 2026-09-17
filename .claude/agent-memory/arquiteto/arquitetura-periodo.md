---
name: arquitetura-periodo
description: Contrato do RDO de período escrito em 17/09/2026 — conjunto de dias (não intervalo), portas plurais, e os cinco rótulos que o gabarito não tem
metadata:
  type: project
---

Escrevi `docs/arquitetura/periodo.md` em 17/09/2026: o contrato do **RDO de
período** (consolidado), para três frentes — L (leitura), C (cálculo), S (saída).

**Why:** o dono do produto fechou nove decisões (conjunto de dias, média por dia,
atividades por data, total de mm mais contagem por letra, EXEC. no conjunto e
ACUM. até o último dia, faixa de RDO, três modos de exportação, Excel espelhando
o PDF) e deixou o físico e o contrato para mim. Ainda **sem número no PRD**: a
numeração livre seguinte é a **38**, e entrar lá é tarefa do coordenador.

**How to apply:** antes de decidir qualquer coisa sobre período, leia a seção 7
(15 decisões com alternativa recusada) e a 9 (PP-1 a PP-5). Três amarrações que
não se reabrem sem motivo novo:

1. **A entrada é conjunto, nunca intervalo.** `EXEC.` de `{02,05,09}` não pode
   somar o dia 03; `ACUM.` soma tudo até 09, inclusive o 03. As duas metades da
   mesma frase.
2. **Portas plurais** (`diasDeObra(obraId, dias)`, etc.), não `PortasDoRdo` N
   vezes. O motivo forte é **determinismo**, não custo: N consultas separadas
   fazem o consolidado discordar dos diários que ele anexa.
3. **O diário entregue não muda uma linha.** Os anexos saem de um `PortasDoRdo`
   em memória sobre os dados já buscados.

Duas coisas que **bloqueiam** trabalho e precisam de quem responde pelo produto:
`CLAUDE.md` ainda lista "RDO semanal e mensal" e "Exportação em Excel" como fora
de escopo; e A1 a A5 da seção 6 são os rótulos que o gabarito não tem (contadores
de dias por letra, média no bloco de efetivo, agrupamento por data). Sem eles o
PDF do consolidado não se desenha — tela, cálculo e anexos seguem.

Ver também [[arquitetura-v1]], que este documento não reabre.
