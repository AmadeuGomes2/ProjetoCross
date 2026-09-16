/**
 * CT-260 a CT-265 — transbordo no PDF.
 * Casos em `docs/qa/v1-casos-passo-6.md`, funcionalidade F6.3 do PRD.
 *
 * Decisão 11.1: o dia que transborda o layout ganha uma **segunda página de
 * continuação**, com o mesmo cabeçalho de identificação. Transbordo nunca é
 * truncamento silencioso, e gerar segunda página antes da hora é divergência
 * tanto quanto truncar.
 *
 * Onde cada metade é testada: **quem divide** é a projeção do `rdo`, e as
 * fronteiras 15/16, 4/5 e 41/42 estão travadas lá
 * (`src/modules/rdo/para-documento.test.ts`). **Quem imprime** é este módulo, e
 * o que se trava aqui é que a continuação vira página e que nada some.
 */

import { describe, expect, it } from 'vitest';

import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { ROTULO } from './documento/rotulos';
import { contaPaginas, textoDoDocumento, textosDaPagina } from './teste/arvore';
import type {
  CelulaDeEfetivo,
  LinhaDeAtividadeNoPapel,
  RdoParaDocumento,
} from './portas';
import { RDO_DE_EXEMPLO } from './teste/duplas';

function atividades(quantidade: number, de = 1): LinhaDeAtividadeNoPapel[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    chave: `a-${de + i}`,
    descricao: `Atividade ${de + i}`,
    status: 'Produção',
  }));
}

function colunas(quantidade: number, de = 1): CelulaDeEfetivo[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    chave: `f-${de + i}`,
    rotulo: `Funcao ${de + i}`,
    quantidade: '1',
  }));
}

describe('uma página é o normal (CT-260, CT-263, CT-264)', () => {
  it('imprime 15 atividades numa página só', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      atividades: { pagina1: atividades(15), continuacao: [] },
    };
    const documento = montaDocumentoDoRdo(doc);
    expect(contaPaginas(documento)).toBe(1);
    expect(textoDoDocumento(documento)).toContain('Atividade 15');
  });

  it('imprime 4 linhas de comentário numa página só', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      comentariosCros: {
        pagina1: ['linha 1', 'linha 2', 'linha 3', 'linha 4'],
        continuacao: [],
      },
    };
    expect(contaPaginas(montaDocumentoDoRdo(doc))).toBe(1);
  });

  it('imprime 41 colunas de função numa página só', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      efetivoPessoal: { pagina1: colunas(41), continuacao: [], total: '41' },
    };
    const documento = montaDocumentoDoRdo(doc);
    expect(contaPaginas(documento)).toBe(1);
    expect(textoDoDocumento(documento)).toContain('Funcao 41');
  });
});

describe('continuação na segunda página (CT-261, CT-262, CT-265)', () => {
  it('manda a 16.ª atividade para a continuação, sem perder nenhuma', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      atividades: { pagina1: atividades(15), continuacao: atividades(1, 16) },
      temContinuacao: true,
    };
    const documento = montaDocumentoDoRdo(doc);

    expect(contaPaginas(documento)).toBe(2);
    expect(textosDaPagina(documento, 1)).toContain('Atividade 15');
    expect(textosDaPagina(documento, 1)).not.toContain('Atividade 16');
    expect(textosDaPagina(documento, 2)).toContain('Atividade 16');
  });

  it('repete o cabeçalho de identificação na página de continuação', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      atividades: { pagina1: atividades(15), continuacao: atividades(1, 16) },
      temContinuacao: true,
    };
    const pagina2 = textosDaPagina(montaDocumentoDoRdo(doc), 2);
    expect(pagina2).toContain('03/09/2026');
    expect(pagina2).toContain(ROTULO.NUMERO_DO_RDO);
    // A marca `CONTINUAÇÃO` não é mais texto fixo da árvore: ela depende do
    // número da página, que só existe depois de paginar, e por isso passa a ser
    // conferida no PDF gerado, em `pdf-renderizado.test.ts`. A troca é por algo
    // mais forte — a marca agora acompanha **qualquer** página a partir da
    // segunda, inclusive uma que o renderizador criasse por conta própria.
  });

  it('manda a 5.ª linha de comentário para a continuação', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      comentariosCros: {
        pagina1: ['linha 1', 'linha 2', 'linha 3', 'linha 4'],
        continuacao: ['linha 5'],
      },
      temContinuacao: true,
    };
    const documento = montaDocumentoDoRdo(doc);
    expect(textosDaPagina(documento, 1)).toContain('linha 4');
    expect(textosDaPagina(documento, 1)).not.toContain('linha 5');
    expect(textosDaPagina(documento, 2)).toContain('linha 5');
  });

  it('manda a 42.ª coluna para a continuação e mantém o total somando 42', () => {
    // CT-265: somar só o que coube na página 1 é o defeito silencioso mais
    // provável do transbordo.
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      efetivoPessoal: {
        pagina1: colunas(41),
        continuacao: colunas(1, 42),
        total: '42',
      },
      temContinuacao: true,
    };
    const documento = montaDocumentoDoRdo(doc);
    expect(textosDaPagina(documento, 1)).not.toContain('Funcao 42');
    expect(textosDaPagina(documento, 2)).toContain('Funcao 42');
    const pagina1 = textosDaPagina(documento, 1);
    expect(pagina1[pagina1.indexOf(ROTULO.TOTAL) + 1]).toBe('42');
  });
});
