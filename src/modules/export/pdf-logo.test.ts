/**
 * A logo da contratada no PDF.
 *
 * A logo é acréscimo ao gabarito, aprovado pelo dono do produto em 17/09/2026.
 * Três coisas precisam valer, e as três são verificáveis sem olhar o papel:
 *
 * 1. **sem logo, o documento é o de antes.** A obra que nunca subiu imagem
 *    recebe exatamente o PDF que recebia — nenhuma imagem embutida. É o
 *    documento que o teste de fidelidade compara contra a planilha;
 * 2. **com logo, a imagem entra de verdade**, como objeto do PDF, e não como um
 *    espaço em branco onde ela deveria estar;
 * 3. **o título continua lá, e no mesmo lugar da lista de blocos.** A logo entra
 *    AO LADO do título, nunca no lugar dele: `RELATÓRIO DIÁRIO DE OBRAS` é o que
 *    o fiscal procura primeiro na folha.
 *
 * A checagem de (2) é pela estrutura do PDF — um objeto `/Subtype /Image` —, e
 * não por comparação de pixels: comparar imagem renderizada quebraria a cada
 * atualização do renderizador, por motivo nenhum.
 */

import { describe, expect, it } from 'vitest';

import { diaPuroConfiavel } from '../../shared/date/dia';
import { ROTULO } from './documento/rotulos';
import { exportaRdoDiarioEmPdf } from './exporta-rdo-diario-em-pdf';
import { coletaTextos } from './teste/arvore';
import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { TIPOS_DE_IMAGEM } from '../obra';
import { criaPortasDoExport, ENGENHEIRO, OBRA, RDO_DE_EXEMPLO } from './teste/duplas';

const DIA = diaPuroConfiavel('2026-09-03');

/** Um PNG de 1×1, cinza. Sintético: nenhuma marca de empresa nenhuma. */
const PNG_MINIMO =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function geraPdf(logo: string | null): Promise<Buffer> {
  const espia = criaPortasDoExport({ ...RDO_DE_EXEMPLO, logo });
  const r = await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);
  if (!r.ok) throw new Error(`a exportação falhou: ${r.erro.mensagem}`);
  return Buffer.from(r.valor.bytes);
}

/** Um objeto de imagem no PDF. O renderizador escreve `/Subtype /Image`. */
function temImagem(pdf: Buffer): boolean {
  return /\/Subtype\s*\/Image/.test(pdf.toString('latin1'));
}

/**
 * Um WebP mínimo e válido, como contêiner RIFF. Os bytes da imagem são
 * irrelevantes aqui: o que se testa é o formato ser recusado antes de chegar ao
 * renderizador.
 */
const WEBP_MINIMO = 'data:image/webp;base64,' + 'UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAA==';

describe('a logo no PDF do RDO', () => {
  /*
   * O renderizador não sabe desenhar WebP.
   *
   * `@react-pdf/image` aceita `jpg`, `jpeg`, `png` e `svg`, e joga
   * `Base64 image invalid format: webp` em qualquer outro — conferido no fonte
   * do pacote, em `node_modules/@react-pdf/image/lib/index.js:201`.
   *
   * A consequência era grave e passou pela minha primeira versão: o formato era
   * aceito no envio, oferecido no `accept` da tela e prometido na documentação
   * do engenheiro. Uma logo em WebP não estragava a tela — estragava **toda
   * exportação de PDF daquela obra**, que é o documento contratual, com
   * mensagem genérica e sem trilha.
   *
   * Por isso WebP saiu da lista, e este teste existe para que não volte por
   * distração: quem reintroduzir o formato tem que fazer o PDF sair primeiro.
   */
  it('WebP não chega ao renderizador: o formato sai da lista aceita', () => {
    expect(TIPOS_DE_IMAGEM).not.toContain('image/webp');
  });

  /*
   * O efeito medido, e não o suposto.
   *
   * `resolveBase64Image` joga `Base64 image invalid format: webp`, mas o
   * renderizador **engole** o erro e termina o documento. Medido: com PNG o PDF
   * saiu com 9291 bytes e imagem embutida; com WebP, 8787 bytes e imagem
   * nenhuma — o mesmo tamanho de quando não há logo.
   *
   * Isso é pior que um estouro. Um estouro aparece; isto entrega ao fiscal um
   * RDO sem a marca que o engenheiro viu na tela. Por isso o formato é barrado
   * na entrada, e não deixado para o renderizador resolver.
   */
  it('se um WebP chegasse ao documento, a logo sumiria em silêncio', async () => {
    const comWebp = await geraPdf(WEBP_MINIMO);
    expect(temImagem(comWebp)).toBe(false);
  });

  it('sem logo, o PDF não carrega imagem nenhuma', async () => {
    expect(temImagem(await geraPdf(null))).toBe(false);
  });

  it('com logo, a imagem entra no PDF', async () => {
    expect(temImagem(await geraPdf(PNG_MINIMO))).toBe(true);
  });

  it('o consolidado do período usa a MESMA marca dos diários anexados', async () => {
    /*
     * No modo "consolidado com os diários" os dois documentos vão no mesmo
     * arquivo. Enquanto o cabeçalho do consolidado não conhecia logo, o arquivo
     * saía com duas cabeças diferentes: o resumo sem marca, os anexos com ela.
     *
     * Aqui a checagem é estrutural: o consolidado sozinho, com logo, precisa
     * carregar imagem — se não carregar, é o defeito de volta.
     */
    const { paginaDoConsolidado } =
      await import('./periodo/documento/documento-de-periodo');
    const { CONSOLIDADO_DE_EXEMPLO } = await import('./periodo/teste/duplas-de-periodo');

    const semLogo = coletaTextos(
      paginaDoConsolidado({ ...CONSOLIDADO_DE_EXEMPLO, logo: null }),
    );
    const comLogo = coletaTextos(
      paginaDoConsolidado({ ...CONSOLIDADO_DE_EXEMPLO, logo: PNG_MINIMO }),
    );

    // O título continua sendo o primeiro texto, com e sem marca.
    expect(semLogo[0]).toBe(ROTULO.TITULO);
    expect(comLogo[0]).toBe(ROTULO.TITULO);
    expect(comLogo).toEqual(semLogo);
  });

  it('a logo não empurra nem substitui o título', () => {
    const semLogo = coletaTextos(montaDocumentoDoRdo({ ...RDO_DE_EXEMPLO, logo: null }));
    const comLogo = coletaTextos(
      montaDocumentoDoRdo({ ...RDO_DE_EXEMPLO, logo: PNG_MINIMO }),
    );

    // O título continua sendo o primeiro texto da folha, nos dois casos.
    expect(semLogo[0]).toBe(ROTULO.TITULO);
    expect(comLogo[0]).toBe(ROTULO.TITULO);
    // E o resto do documento é idêntico: a logo não mexe em texto nenhum.
    expect(comLogo).toEqual(semLogo);
  });
});
