/**
 * Os três modos de exportação do período, e a trilha que os precede.
 *
 * Origem das expectativas:
 *
 * - `docs/arquitetura/periodo.md`, 4.1 e 4.2 (DP9): os modos são
 *   `consolidado`, `diarios` e `consolidado-com-diarios`, num **parâmetro** só,
 *   e no terceiro o consolidado vem primeiro, os diários depois, em ordem
 *   crescente de dia;
 * - `CLAUDE.md`, Segurança: exportação é ato registrado — quem, quando, qual
 *   obra, qual período — com id e nunca nome; e nada de nome de pessoa em
 *   metadado nem em nome de arquivo;
 * - contrato 4.5: **uma linha por dia** do conjunto, todas com o mesmo lote;
 * - contrato 4.4: `rdo-periodo-AAAA-MM-DD-a-AAAA-MM-DD.pdf`;
 * - R19 e decisão 27.1, em PP-1: exportar é do engenheiro.
 *
 * Os diários anexados são o documento já aprovado, sem uma linha de diferença:
 * o teste confere que a página do diário dentro do pacote traz os mesmos
 * blocos que `montaDocumentoDoRdo` produz sozinho.
 */

import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';

import { CODIGO_ERRO, erro, erroDeDominio } from '../../../shared/result';
import { contaPaginas, metadadosDoDocumento, textosDaPagina } from '../teste/arvore';
import { lePdf, textosDaPaginaDoPdf } from '../teste/leitura-de-pdf';
import { montaDocumentoDoPacote } from './documento/documento-do-pacote';
import { exportaRdoDePeriodo } from './exporta-rdo-de-periodo';
import { nomeDoArquivoDoPeriodo } from './nome-do-arquivo-de-periodo';
import type { PacoteParaDocumento } from './portas';
import {
  criaPortasDoExportDePeriodo,
  DIAS_DO_CONJUNTO,
  ENCARREGADO,
  ENGENHEIRO,
  MOMENTO,
  OBRA,
  PACOTE_COMPLETO,
  PACOTE_CONSOLIDADO,
  PACOTE_DIARIOS,
} from './teste/duplas-de-periodo';

const PEDIDO = {
  obraId: OBRA,
  dias: DIAS_DO_CONJUNTO,
  modo: 'consolidado',
  formato: 'PDF',
} as const;

describe('os três modos produzem PDF', () => {
  it.each([
    ['consolidado', PACOTE_CONSOLIDADO],
    ['diarios', PACOTE_DIARIOS],
    ['consolidado-com-diarios', PACOTE_COMPLETO],
  ] as const)(
    'o modo %s gera bytes de PDF',
    async (_modo, pacote: PacoteParaDocumento) => {
      const bytes = await renderToBuffer(montaDocumentoDoPacote(pacote));
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    },
  );

  it('o modo diarios sai com uma página por dia no papel, e não só na árvore', async () => {
    // A árvore é cega para o que só acontece na paginação: foi assim que o
    // laudo `docs/fidelidade/2026-09-16-rdo-diario.md` achou uma página órfã.
    const pdf = lePdf(await renderToBuffer(montaDocumentoDoPacote(PACOTE_DIARIOS)));
    expect(pdf.paginas).toHaveLength(3);
  });

  it('toda página do consolidado chega com a identificação do período', async () => {
    // Decisão 11.1, aplicada ao consolidado: a folha que o renderizador criar
    // sozinho não pode chegar ao fiscal sem dizer de que período ela é.
    const pdf = lePdf(await renderToBuffer(montaDocumentoDoPacote(PACOTE_CONSOLIDADO)));
    for (let pagina = 1; pagina <= pdf.paginas.length; pagina += 1) {
      // O leitor devolve um trecho por operador de mostra, e o renderizador
      // quebra a faixa em dois; o espaço a mais é da leitura, não do papel.
      const trechos = textosDaPaginaDoPdf(pdf, pagina).join(' ').replace(/\s+/g, ' ');
      expect(trechos).toContain('02/09/2026 a 09/09/2026');
    }
  });
});

describe('o modo diarios anexa uma página por dia', () => {
  it('três dias dão três páginas, sem consolidado nenhum', () => {
    const documento = montaDocumentoDoPacote(PACOTE_DIARIOS);
    expect(contaPaginas(documento)).toBe(3);
  });

  it('as páginas saem em ordem crescente de dia', () => {
    const documento = montaDocumentoDoPacote(PACOTE_DIARIOS);
    expect(textosDaPagina(documento, 1)).toContain('02/09/2026');
    expect(textosDaPagina(documento, 2)).toContain('05/09/2026');
    expect(textosDaPagina(documento, 3)).toContain('09/09/2026');
  });

  it('cada página anexada é o diário aprovado, com os blocos dele', () => {
    const documento = montaDocumentoDoPacote(PACOTE_DIARIOS);
    const primeira = textosDaPagina(documento, 1);
    for (const rotulo of [
      'RELATÓRIO DIÁRIO DE OBRAS',
      'INFORMAÇÕES GERAIS',
      'PRODUÇÃO CONTROLADA',
      'NOITE ANTER',
      'COMENTÁRIOS CROS',
      'REPRESENTANTE CONTRATANTE',
    ]) {
      expect(primeira).toContain(rotulo);
    }
  });
});

describe('o modo consolidado-com-diarios', () => {
  it('põe o consolidado primeiro e os diários depois', () => {
    // 4.2: o fiscal lê o resumo e depois a evidência.
    const documento = montaDocumentoDoPacote(PACOTE_COMPLETO);
    expect(contaPaginas(documento)).toBe(4);
    expect(textosDaPagina(documento, 1)).toContain('02/09/2026 a 09/09/2026');
    expect(textosDaPagina(documento, 2)).toContain('02/09/2026');
    expect(textosDaPagina(documento, 4)).toContain('09/09/2026');
  });

  it('o modo consolidado sozinho não anexa diário nenhum', () => {
    const documento = montaDocumentoDoPacote(PACOTE_CONSOLIDADO);
    expect(contaPaginas(documento)).toBe(1);
  });
});

describe('metadados e nome do arquivo não carregam nome de pessoa', () => {
  it('o produtor e o autor são o sistema', () => {
    const metadados = metadadosDoDocumento(montaDocumentoDoPacote(PACOTE_COMPLETO));
    expect(metadados.author).toBe('RDO digital');
    expect(metadados.producer).toBe('RDO digital');
    expect(metadados.title).not.toContain('R1');
    expect(metadados.keywords).toBe('');
  });

  it('o nome do arquivo tem as duas datas e a palavra rdo-periodo', () => {
    const primeiro = DIAS_DO_CONJUNTO[0];
    const ultimo = DIAS_DO_CONJUNTO[2];
    expect(nomeDoArquivoDoPeriodo(primeiro, ultimo, 'PDF')).toBe(
      'rdo-periodo-2026-09-02-a-2026-09-09.pdf',
    );
    expect(nomeDoArquivoDoPeriodo(primeiro, ultimo, 'XLSX')).toBe(
      'rdo-periodo-2026-09-02-a-2026-09-09.xlsx',
    );
  });
});

describe('perfil e trilha (R19, R20)', () => {
  it('o encarregado não exporta o consolidado', async () => {
    // PP-1: assumido que só o engenheiro, que é a regra da exportação (27.1).
    const espia = criaPortasDoExportDePeriodo();
    const saida = await exportaRdoDePeriodo(PEDIDO, ENCARREGADO, espia.portas);

    expect(saida.ok).toBe(false);
    if (saida.ok) throw new Error('a recusa não aconteceu');
    expect(saida.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
  });

  it('a recusa por perfil não deixa registro fantasma na trilha', async () => {
    const espia = criaPortasDoExportDePeriodo();
    await exportaRdoDePeriodo(PEDIDO, ENCARREGADO, espia.portas);
    expect(espia.registros).toHaveLength(0);
  });

  it('grava uma linha por dia do conjunto, todas com o mesmo lote', async () => {
    // 4.5: o par data inicial/final mentiria sobre conjunto não contíguo.
    const espia = criaPortasDoExportDePeriodo();
    const saida = await exportaRdoDePeriodo(PEDIDO, ENGENHEIRO, espia.portas);

    expect(saida.ok).toBe(true);
    expect(espia.registros).toHaveLength(3);
    expect(espia.registros.map((r) => r.dia)).toEqual([
      '2026-09-02',
      '2026-09-05',
      '2026-09-09',
    ]);
    expect(new Set(espia.registros.map((r) => r.loteId)).size).toBe(1);
  });

  it('a trilha guarda quem, quando, qual obra e qual formato', async () => {
    const espia = criaPortasDoExportDePeriodo();
    await exportaRdoDePeriodo({ ...PEDIDO, formato: 'XLSX' }, ENGENHEIRO, espia.portas);

    const primeiro = espia.registros[0];
    expect(primeiro?.obraId).toBe(OBRA);
    expect(primeiro?.usuarioId).toBe(ENGENHEIRO.usuarioId);
    expect(primeiro?.momento).toBe(MOMENTO);
    expect(primeiro?.formato).toBe('XLSX');
  });

  it('sem trilha não há exportação', async () => {
    const espia = criaPortasDoExportDePeriodo(PACOTE_CONSOLIDADO, undefined, () =>
      Promise.resolve(erro(erroDeDominio(CODIGO_ERRO.FALHA_INESPERADA, 'banco fora'))),
    );
    const saida = await exportaRdoDePeriodo(PEDIDO, ENGENHEIRO, espia.portas);

    expect(saida.ok).toBe(false);
    if (saida.ok) throw new Error('o arquivo foi entregue sem trilha');
    expect(saida.erro.mensagem).not.toContain('banco fora');
  });

  it('o erro de montagem não vira arquivo', async () => {
    const espia = criaPortasDoExportDePeriodo(PACOTE_CONSOLIDADO, () =>
      Promise.resolve(
        erro(
          erroDeDominio(
            CODIGO_ERRO.FORA_DO_PERIODO_DA_OBRA,
            'A data está fora do contrato.',
          ),
        ),
      ),
    );
    const saida = await exportaRdoDePeriodo(PEDIDO, ENGENHEIRO, espia.portas);

    expect(saida.ok).toBe(false);
    expect(espia.registros).toHaveLength(0);
  });

  it('entrega bytes de PDF e o nome do arquivo do período', async () => {
    const espia = criaPortasDoExportDePeriodo(PACOTE_COMPLETO);
    const saida = await exportaRdoDePeriodo(
      { ...PEDIDO, modo: 'consolidado-com-diarios' },
      ENGENHEIRO,
      espia.portas,
    );

    expect(saida.ok).toBe(true);
    if (!saida.ok) throw new Error(saida.erro.mensagem);
    expect(saida.valor.nomeDoArquivo).toBe('rdo-periodo-2026-09-02-a-2026-09-09.pdf');
    expect(Buffer.from(saida.valor.bytes).subarray(0, 5).toString('latin1')).toBe(
      '%PDF-',
    );
  });

  it('entrega bytes de planilha quando o formato é XLSX', async () => {
    const espia = criaPortasDoExportDePeriodo(PACOTE_CONSOLIDADO);
    const saida = await exportaRdoDePeriodo(
      { ...PEDIDO, formato: 'XLSX' },
      ENGENHEIRO,
      espia.portas,
    );

    expect(saida.ok).toBe(true);
    if (!saida.ok) throw new Error(saida.erro.mensagem);
    expect(saida.valor.nomeDoArquivo).toBe('rdo-periodo-2026-09-02-a-2026-09-09.xlsx');
    // Todo `.xlsx` é um zip: os dois primeiros bytes são `PK`.
    expect(Buffer.from(saida.valor.bytes).subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
