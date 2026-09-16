---
name: como-gerar-e-ler-o-pdf-real
description: Receita que funcionou para renderizar o PDF do RDO de verdade e ler texto, coordenadas e metadados dele, sem depender do código-fonte
metadata:
  type: project
---

Dá para conferir o **PDF renderizado**, e não só a árvore React. Foi assim que as
divergências de 16/09/2026 apareceram — nenhuma delas era visível lendo o código.

**Why:** os defeitos mais graves do documento nasceram do **renderizador**, não do
gerador: hifenização automática que parte um rótulo, quebra de página automática
que cria uma folha órfã. O código está certo e o papel sai errado. Conferir só a
árvore de elementos (`src/modules/export/teste/arvore.ts`) não pega nada disso.

**How to apply:**

1. `tsx` direto **não funciona** — `@react-pdf/hyphenate` não exporta `./en-us` e a
   resolução ESM quebra. Use **vitest**: um arquivo `*.test.ts` temporário dentro
   de `src/modules/export/`, que importa `montaDocumentoDoRdo` e `renderToBuffer`,
   monta cenários a partir de `RDO_DE_EXEMPLO` (`src/modules/export/teste/duplas.ts`,
   dado sintético) e grava os bytes no scratchpad. **Apague o arquivo ao terminar** e
   confira o `git status`.
2. `console.log` dentro do teste não aparece na saída do vitest. Grave em arquivo.
3. Para ler o PDF: os fluxos são `FlateDecode`, `zlib.inflateSync`. O texto está em
   **strings hexadecimais** dentro de arrays `[...] TJ`, não em `(...) Tj` — um
   extrator que só procura parênteses devolve vazio. Decodifique em
   `WinAnsiEncoding` (`D3`=Ó, `C1`=Á, `C7`=Ç, `E7`=ç, `BA`=º…).
4. Para saber se dois textos estão na **mesma linha**, acumule as translações
   `1 0 0 1 x y cm` respeitando `q`/`Q`. Foi assim que se provou que `12 ` e `mm`
   são a mesma linha (ok) e que `COMENTÁRIO CON-` e `TRATANTE` não são (defeito).
5. Metadados: o `/Info` aponta para objetos de string soltos (`14 0 obj (…)`), e o
   `Title` vem em UTF-16 com BOM `þÿ`. Confira ali que não há nome de pessoa.
6. Conte páginas pelo número de fluxos que contêm `TJ`. É o teste que denuncia a
   quebra automática.

Cenários que valem sempre: `normal`, `parado`, `transbordo` (acima dos limites) e
**`denso`** — 41 funções + 41 equipamentos + 15 atividades longas + 4 linhas de
comentário cheias. O `denso` é o que revelou o CRÍTICO 1.

Ver [[divergencias-recorrentes-rdo-diario]].
