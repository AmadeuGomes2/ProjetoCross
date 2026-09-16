/**
 * Desliga a hifenização automática do `@react-pdf`.
 *
 * Por padrão o renderizador quebra palavra no meio e insere um hífen quando ela
 * não cabe na caixa: `COMENTÁRIO CON-` / `TRATANTE`, `Tecnico de Se-` /
 * `guranca do Tra-` / `balho`. O laudo
 * `docs/fidelidade/2026-09-16-rdo-diario.md` achou isso em 100% dos documentos.
 *
 * O hífen inserido é texto que não existe no documento que o fiscal lê há
 * meses, e em texto livre do encarregado ele muda a leitura de um número de rua
 * ou de um trecho. Com a devolução da palavra inteira, o que não cabe quebra
 * **por palavra**, que é como a planilha quebra.
 *
 * O registro é global do renderizador e roda uma vez, no carregamento do
 * módulo do documento, antes de qualquer `render`.
 */

import { Font } from '@react-pdf/renderer';

Font.registerHyphenationCallback((palavra) => [palavra]);
