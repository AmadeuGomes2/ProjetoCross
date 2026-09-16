---
name: gabarito-visual-ausente
description: A planilha de referência nunca esteve em referencia/ — só o README; toda conferência até 16/09/2026 usou apenas o gabarito escrito da skill
metadata:
  type: project
---

Em 16/09/2026 a pasta `referencia/` continha **apenas** `README.md`. O usuário
ainda não copiou a planilha `.xlsm` real para lá.

**Why:** `referencia/` está no `.gitignore` (dado de obra real não é versionado,
CLAUDE.md, Segurança), então o gabarito visual depende de o usuário copiar o
arquivo à mão em cada máquina. Sem ele não existe comparação visual possível.

**How to apply:** antes de qualquer conferência, cheque se há algo além do README
em `referencia/`. Se não houver, a **primeira linha** do laudo diz isso, e estes
itens vão obrigatoriamente para "não conferido": fonte, corpo, espessura de
borda, largura de coluna, altura de linha, margens, posição do quadro na folha,
posição da barra de dados dentro da célula. Não deduza nenhum deles do código —
o código é a hipótese, não o gabarito.

O gabarito **escrito** (`.claude/skills/fidelidade-documento/SKILL.md`, extraído
célula a célula e atualizado em 16/09/2026) cobre bloco, ordem, rótulo, unidade e
total — o que é CRÍTICO e ATENÇÃO. Dá para fechar um laudo útil só com ele.

Ver [[como-gerar-e-ler-o-pdf-real]] e [[divergencias-recorrentes-rdo-diario]].
