---
name: limites-do-renderizador-de-pdf
description: O que @react-pdf/renderer e o PDFKit realmente fazem com imagem — so jpg/png/svg, e JPEG entra verbatim com EXIF — e por que a lista de formatos aceitos precisa ser conferida contra eles
metadata:
  type: project
---

Verificado no pacote instalado em 17/09/2026, ao auditar a logo da obra
(`docs/seguranca/2026-09-17-logo-da-obra.md`, ATENÇÃO 1 e 2).

- **`@react-pdf/image` só lê `jpg`, `jpeg`, `png`, `svg`, `svg+xml`**
  (`isValidFormat`). Qualquer outro formato num `data:` URI faz o render
  **lançar**, não degradar. Confirmado empiricamente chamando o resolvedor:
  `data:image/webp` lança `Base64 image invalid format: webp`; PNG passa.
- **JPEG entra no PDF verbatim.** O PDFKit escreve o fluxo original como
  `Filter: DCTDecode` (`this.obj.end(this.data)`), com os marcadores APP1
  dentro: EXIF e XMP sobrevivem até o arquivo que vai ao fiscal. **PNG não** —
  o PDFKit re-empacota só o `IDAT`, e `tEXt`/`iTXt`/XMP ficam de fora do PDF
  (mas continuam nos bytes servidos por qualquer rota que devolva o original).

**Why:** a logo nasceu com a lista `PNG, JPEG, WebP` repetida em quatro lugares
— borda (`identificaImagem`), `CHECK` do banco, `accept=` do `<input>` e o texto
do produto — e **nenhum deles sabia o que o renderizador lê**. WebP passa nos
quatro e quebra toda exportação de PDF da obra, com mensagem genérica. O mesmo
descasamento produz o vazamento de metadado: ninguém limpa a imagem porque
ninguém suspeita que ela viaja inteira.

**How to apply:** toda vez que uma lista de formatos de imagem for acrescentada
ou alargada, conferir contra `isValidFormat` do pacote **instalado**, não contra
a memória — e exigir um caso de teste que ligue a borda ao renderizador ("logo
em cada formato aceito gera PDF"). Ao ver upload de imagem que é gravado e
servido sem re-codificação, tratar metadado como achado até prova em contrário.
Ver [[invariantes-ja-provados]].
