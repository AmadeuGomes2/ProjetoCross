/**
 * A projeção do RDO para o documento.
 *
 * Origem das expectativas:
 * - decisão 3.3: o resumo do dia aparece na tela e **não** no PDF;
 * - decisão 12.1: aviso é de tela;
 * - decisão 11.1 e R10: 15 atividades, 4 linhas de comentário e 41 colunas
 *   cabem na página 1; o que passa disso vai para a continuação, e o TOTAL
 *   continua somando tudo (CT-260 a CT-265);
 * - decisão 21.1: sem período de BMS, o campo sai vazio;
 * - decisão 17.1: espaço no fim de texto fixo é normalizado (CT-255).
 */

import { describe, expect, it } from 'vitest';

import { idConfiavel } from '../../shared/id';
import { paraDocumento } from './para-documento';
import type { FuncaoParaEfetivo, PessoaMobilizada } from './portas';
import { montaOuFalha } from './teste/ajuda';
import { atividade, CABECALHO_PADRAO, dia, observacao } from './teste/duplas';

function muitasAtividades(quantidade: number) {
  return Array.from({ length: quantidade }, (_, i) =>
    atividade(`a-${i + 1}`, `Atividade ${i + 1}`, 'Produção'),
  );
}

function funcoes(quantidade: number): FuncaoParaEfetivo[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    funcaoId: idConfiavel<'funcao'>(`f-${i + 1}`),
    termo: `Funcao ${i + 1}`,
    ordem: i + 1,
  }));
}

function pessoas(quantidade: number): PessoaMobilizada[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    pessoaId: idConfiavel<'pessoa'>(`p-${i + 1}`),
    // A função é da passagem (decisão 29.1).
    passagens: [
      {
        funcaoId: idConfiavel<'funcao'>(`f-${i + 1}`),
        entrada: dia('2026-02-05'),
        saida: null,
      },
    ],
  }));
}

describe('o que o documento não recebe', () => {
  it('não recebe o resumo do dia nem os avisos', async () => {
    const rdo = await montaOuFalha('2026-08-15', {
      periodos: [{ numero: 1, inicial: '2026-02-05', final: '2026-02-28' }],
    });
    expect(rdo.resumoDoDia).not.toBeUndefined();
    expect(rdo.avisos.length).toBeGreaterThan(0);

    const documento = paraDocumento(rdo);
    const serializado = JSON.stringify(documento);
    expect(serializado).not.toContain('resumo');
    expect(serializado).not.toContain('aviso');
  });

  it("deixa o campo BM'S vazio quando nenhum período cobre a data", async () => {
    const rdo = await montaOuFalha('2026-08-15', {
      periodos: [{ numero: 1, inicial: '2026-02-05', final: '2026-02-28' }],
    });
    expect(paraDocumento(rdo).identificacao.bms).toBe('');
  });
});

describe('textos fixos (decisão 17.1, CT-255)', () => {
  it('recorta o espaço do fim e preserva o do meio', async () => {
    const rdo = await montaOuFalha('2026-09-03', {
      cabecalho: { ...CABECALHO_PADRAO, area: 'MONTES CLAROS - MG ' },
    });
    const documento = paraDocumento(rdo);
    expect(documento.caracteristicas.area).toBe('MONTES CLAROS - MG');
    expect(documento.caracteristicas.nome).toBe('SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02');
  });
});

describe('divisão de página (decisão 11.1)', () => {
  it('põe 15 atividades na página 1 e não abre continuação', async () => {
    // CT-260, fronteira.
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': muitasAtividades(15) },
    });
    const documento = paraDocumento(rdo);
    expect(documento.atividades.pagina1).toHaveLength(15);
    expect(documento.atividades.continuacao).toHaveLength(0);
    expect(documento.temContinuacao).toBe(false);
  });

  it('põe a 16.ª atividade na continuação', async () => {
    // CT-261: o máximo real observado é 11, então o primeiro dia de 16 vai
    // passar despercebido se não houver teste.
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': muitasAtividades(16) },
    });
    const documento = paraDocumento(rdo);
    expect(documento.atividades.pagina1).toHaveLength(15);
    expect(documento.atividades.continuacao.map((a) => a.descricao)).toEqual([
      'Atividade 16',
    ]);
    expect(documento.temContinuacao).toBe(true);
  });

  it('põe 4 linhas de comentário na página 1 e a 5.ª na continuação', async () => {
    // CT-262 e CT-263.
    const quatro = await montaOuFalha('2026-09-04', {
      observacoes: { '2026-09-04': [observacao('o-1', 'a\nb\nc\nd')] },
    });
    expect(paraDocumento(quatro).comentariosCros.continuacao).toHaveLength(0);

    const cinco = await montaOuFalha('2026-09-05', {
      observacoes: { '2026-09-05': [observacao('o-2', 'a\nb\nc\nd\ne')] },
    });
    const documento = paraDocumento(cinco);
    expect(documento.comentariosCros.pagina1).toHaveLength(4);
    expect(documento.comentariosCros.continuacao).toEqual(['e']);
  });

  it('põe 41 colunas de efetivo na página 1 e a 42.ª na continuação, somando 42', async () => {
    // CT-264 e CT-265: o total soma todas, inclusive as que transbordaram.
    const rdo = await montaOuFalha('2026-09-03', {
      funcoes: funcoes(42),
      pessoas: pessoas(42),
    });
    const documento = paraDocumento(rdo);
    expect(documento.efetivoPessoal.pagina1).toHaveLength(41);
    expect(documento.efetivoPessoal.continuacao.map((c) => c.rotulo)).toEqual([
      'Funcao 42',
    ]);
    expect(documento.efetivoPessoal.total).toBe('42');
    expect(documento.temContinuacao).toBe(true);
  });
});

describe('convenções de zero no papel', () => {
  it('deixa a quantidade de efetivo zero em branco', async () => {
    const rdo = await montaOuFalha('2026-09-03');
    const documento = paraDocumento(rdo);
    const topografo = documento.efetivoPessoal.pagina1.find(
      (c) => c.rotulo === 'Topografo',
    );
    expect(topografo?.quantidade).toBe('');
  });

  it('imprime o motivo de parada como linha sem status', async () => {
    const rdo = await montaOuFalha('2026-09-06', {
      dias: {
        '2026-09-06': {
          estado: 'parado',
          motivoParada: 'Domingo',
          numeroRdoCongelado: null,
          eDiaFechado: false,
        },
      },
    });
    const documento = paraDocumento(rdo);
    expect(documento.atividades.pagina1).toEqual([
      { chave: 'motivo-de-parada', descricao: 'Domingo', status: '' },
    ]);
  });
});
