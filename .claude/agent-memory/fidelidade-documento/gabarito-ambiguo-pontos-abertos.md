---
name: gabarito-ambiguo-pontos-abertos
description: Pontos onde o gabarito do RDO não decide, com a leitura adotada em 16/09/2026 — e o que já foi decidido e não se reabre
metadata:
  type: project
---

Onde o gabarito é ambíguo, a leitura adotada fica registrada aqui como **leitura**,
nunca como decisão. Quem decide é quem responde pelo produto.

**Why:** decidir sozinho um ponto ambíguo e depois tratá-lo como gabarito
contamina todas as conferências seguintes: o laudo passa a validar a escolha do
agente em vez do documento do cliente.

**How to apply:** ao encontrar um destes, reporte a leitura adotada e pergunte;
não abra divergência contra ela nem a "corrija".

- **Largura do número no nome do arquivo** (17.3). `rdo-AAAA-MM-DD-nNNN.pdf`, com o
  exemplo `rdo-2026-09-01-n208.pdf`. Leitura adotada: `NNN` é a largura do exemplo,
  não largura fixa. `n210` e `n0` estão **corretos**; zero à esquerda inventaria um
  identificador que não aparece no documento, já que o `RDO Nº` impresso é `0` no
  primeiro dia. Perguntado em 16/09/2026, sem resposta ainda.
- **Percentual acima de 100%.** O número sai `679,84%` e a barra fica presa em 100%.
  O gabarito não diz o que a planilha desenha.
- **Posição da barra de dados na célula.** No Excel a barra fica **atrás** do número;
  no PDF sai empilhada, número em cima e barra abaixo. Os dois elementos existem,
  que é o critério duro. A disposição depende do gabarito visual.
- **Assinaturas na página de continuação.** A página 2 não as repete. O gabarito
  não diz se deveria.

**Já decidido, não reabrir:** espaço sobrando no **fim** de texto fixo
(`MONTES CLAROS - MG `) é **normalizado** — decisão 17.1 de 16/09/2026, registrada
em `docs/dominio/duvidas.md`, dúvida 10, que está marcada RESPONDIDA. Espaço no
**meio** continua preservado (`PAVIMENTAÇÃO␣␣- BLOCO 02`, `URBANAS␣␣DA CIDADE`).
A instrução de sistema deste agente ainda descreve isso como pendente; está
desatualizada, o documento manda.

Ver [[gabarito-visual-ausente]].
