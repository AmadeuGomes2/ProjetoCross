/**
 * A planilha do período — espelho do documento, e nada além disso.
 *
 * Origem das expectativas:
 *
 * - `docs/arquitetura/periodo.md`, 4.3: o Excel consome o **mesmo pacote** que
 *   o PDF, com os mesmos rótulos e a mesma ordem de blocos; toda célula de
 *   texto é forçada como texto, e os metadados não carregam nome de pessoa;
 * - o risco concreto que a seção 4.3 nomeia: `formataBrDuasCasasOuTraco`
 *   devolve `-` para produção zero (`src/shared/decimal/index.ts:166`), e um
 *   valor que começa com `-`, `=`, `+` ou `@` é lido como **fórmula** ao abrir
 *   a planilha. A célula do fiscal precisa continuar valendo `-`;
 * - contrato 2.6: contador de dias é inteiro e vale `0` quando zero.
 *
 * `xlsx` continua proibido (CLAUDE.md): a planilha é escrita com ExcelJS.
 */

import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';

import { linhasDoConsolidado } from './excel/linhas-do-consolidado';
import { montaPlanilhaDoPacote } from './excel/planilha-de-periodo';
import {
  CONSOLIDADO_DE_EXEMPLO,
  PACOTE_COMPLETO,
  PACOTE_CONSOLIDADO,
  PACOTE_DIARIOS,
} from './teste/duplas-de-periodo';

async function abre(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const planilha = new ExcelJS.Workbook();
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  await planilha.xlsx.load(copia);
  return planilha;
}

describe('a planilha espelha o documento', () => {
  it('traz os blocos na mesma ordem do PDF', () => {
    const primeiraColuna = linhasDoConsolidado(CONSOLIDADO_DE_EXEMPLO).map(
      (linha) => linha[0],
    );
    const ordem = [
      'RELATÓRIO DIÁRIO DE OBRAS',
      'INFORMAÇÕES GERAIS',
      'CARACTERISTICAS DO PROJETO',
      'EFETIVO PESSOAL · MÉDIA POR DIA',
      'EFETIVO EQUIPAMENTOS · MÉDIA POR DIA',
      'PRODUÇÃO CONTROLADA',
      'ATIVIDADES',
      'PLUVIOMETRIA',
      'COMENTÁRIOS CROS',
      'REPRESENTANTE CROS CONSTRUÇÕES S/A',
    ].map((rotulo) => {
      const i = primeiraColuna.indexOf(rotulo);
      if (i < 0) throw new Error(`bloco ausente na planilha: ${rotulo}`);
      return i;
    });

    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it('repete os quatro rótulos novos de pluviometria e o INDICE herdado', () => {
    const primeiraColuna = linhasDoConsolidado(CONSOLIDADO_DE_EXEMPLO).map(
      (linha) => linha[0],
    );
    for (const rotulo of [
      'DIAS BONS',
      'DIAS CHUVOSOS',
      'DIAS IMPRATIC.',
      'DIAS PARADOS',
      'INDICE',
    ]) {
      expect(primeiraColuna).toContain(rotulo);
    }
  });

  it('escreve o contador de dias como número, inclusive o zero', () => {
    const linhas = linhasDoConsolidado(CONSOLIDADO_DE_EXEMPLO);
    const impraticaveis = linhas.find((linha) => linha[0] === 'DIAS IMPRATIC.');
    expect(impraticaveis?.[1]).toBe(0);
  });

  it('escreve RDO Nº como a lista dos números, nunca faixa', () => {
    const linhas = linhasDoConsolidado(CONSOLIDADO_DE_EXEMPLO);
    const identificacao = linhas.find((linha) => linha.includes('RDO Nº'));
    expect(identificacao).toContain('209, 212, 216');
  });
});

describe('injeção de fórmula: a célula que vale traço continua valendo traço', () => {
  it('não grava fórmula nenhuma na planilha', async () => {
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_CONSOLIDADO));
    const comFormula: string[] = [];
    planilha.eachSheet((aba) => {
      aba.eachRow((linha) => {
        linha.eachCell((celula) => {
          if (celula.type === ExcelJS.ValueType.Formula) {
            comFormula.push(String(celula.address));
          }
        });
      });
    });
    expect(comFormula).toEqual([]);
  });

  it('a célula do executado zerado vale o traço, como texto', async () => {
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_CONSOLIDADO));
    const aba = planilha.worksheets[0];
    if (aba === undefined) throw new Error('planilha sem aba');

    const tracos: ExcelJS.Cell[] = [];
    aba.eachRow((linha) => {
      linha.eachCell((celula) => {
        if (celula.value === '-') tracos.push(celula);
      });
    });

    expect(tracos.length).toBeGreaterThan(0);
    for (const celula of tracos) {
      expect(celula.type).toBe(ExcelJS.ValueType.String);
      expect(celula.formula).toBeUndefined();
      expect(celula.numFmt).toBe('@');
    }
  });

  it('texto começando com =, + ou @ também fica texto', async () => {
    // O traço é o caso que já existe hoje; os outros três são o mesmo defeito,
    // e uma taxonomia editável pode trazê-los a qualquer momento.
    const consolidado = {
      ...CONSOLIDADO_DE_EXEMPLO,
      atividades: [
        {
          chave: 'd1',
          data: '02/09/2026',
          linhas: [
            { chave: 'a-1', descricao: '=1+1', status: 'Produção' },
            { chave: 'a-2', descricao: '+55 na estaca', status: 'Produção' },
            { chave: 'a-3', descricao: '@fresagem', status: 'Produção' },
          ],
        },
      ],
    };
    const planilha = await abre(
      await montaPlanilhaDoPacote({ modo: 'consolidado', consolidado }),
    );
    const aba = planilha.worksheets[0];
    if (aba === undefined) throw new Error('planilha sem aba');

    const achados = new Map<string, ExcelJS.Cell>();
    aba.eachRow((linha) => {
      linha.eachCell((celula) => {
        const valor = celula.value;
        if (typeof valor === 'string') achados.set(valor, celula);
      });
    });

    for (const texto of ['=1+1', '+55 na estaca', '@fresagem']) {
      const celula = achados.get(texto);
      expect(celula?.type).toBe(ExcelJS.ValueType.String);
      expect(celula?.formula).toBeUndefined();
    }
  });
});

describe('as abas e os metadados', () => {
  it('o modo consolidado tem uma aba só', async () => {
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_CONSOLIDADO));
    expect(planilha.worksheets).toHaveLength(1);
  });

  it('o modo diarios tem uma aba por dia, em ordem crescente', async () => {
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_DIARIOS));
    expect(planilha.worksheets.map((aba) => aba.name)).toEqual([
      'RDO 209',
      'RDO 212',
      'RDO 216',
    ]);
  });

  it('o modo consolidado-com-diarios põe o consolidado na primeira aba', async () => {
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_COMPLETO));
    expect(planilha.worksheets.map((aba) => aba.name)).toEqual([
      'Consolidado',
      'RDO 209',
      'RDO 212',
      'RDO 216',
    ]);
  });

  it('os metadados não carregam nome de pessoa', async () => {
    // A planilha legada vaza quatro nomes só nos metadados (contrato, 4.3).
    const planilha = await abre(await montaPlanilhaDoPacote(PACOTE_COMPLETO));
    expect(planilha.creator).toBe('RDO digital');
    expect(planilha.lastModifiedBy).toBe('RDO digital');
  });
});
