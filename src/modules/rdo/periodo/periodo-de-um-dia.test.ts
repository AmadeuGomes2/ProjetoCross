/**
 * Um conjunto de um dia é o RDO daquele dia.
 *
 * DP1 diz que a entrada é um **conjunto de dias**; o conjunto de um elemento é
 * o caso degenerado, e o consolidado dele precisa dizer exatamente o que o
 * diário já diz. Se divergir, existem duas contas para o mesmo número e o
 * fiscal recebe dois documentos que se contradizem — o defeito que a planilha
 * legada produzia ao replicar o dia em 31 abas.
 *
 * As expectativas absolutas vêm da regra, não da implementação:
 *
 * - efetivo de 02/09/2026 no cadastro sintético: 1 Motorista (PA) e 1 Pedreiro
 *   (PC, que sai nesse dia e conta no dia da saída, decisão 1.1) = 2. Média de
 *   um dia é o próprio efetivo;
 * - produção de REC.(FRESA+CAPA): 5 em 01/09 e 10 em 02/09. `EXEC.` do dia 02 é
 *   10; `ACUM.` até 02 é 15 (`regras-rdo` §2);
 * - número do RDO de 02/09/2026, com contrato iniciado em 05/02/2026: 209
 *   (`regras-rdo` §3, que fixa 208 para 01/09/2026).
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import {
  atividadeEm,
  EQUIPAMENTOS_DE_SETEMBRO,
  leituraEm,
  observacaoEm,
  PESSOAL_DE_SETEMBRO,
  producaoEm,
  registroTrabalhado,
  SERVICO_FRESA_CAPA,
} from './teste/duplas-de-periodo';
import { montaOuFalha } from '../teste/ajuda';
import {
  atividade,
  diaTrabalhado,
  lancamentoDeProducao,
  leituraDePluviometro,
  observacao,
} from '../teste/duplas';

const DIA = '2026-09-02';

const AJUSTES_DO_DIARIO = {
  dias: { [DIA]: diaTrabalhado() },
  pessoas: PESSOAL_DE_SETEMBRO,
  equipamentos: EQUIPAMENTOS_DE_SETEMBRO,
  producao: [
    lancamentoDeProducao('p0', SERVICO_FRESA_CAPA, '2026-09-01', '5'),
    lancamentoDeProducao('p1', SERVICO_FRESA_CAPA, DIA, '10'),
  ],
  atividades: { [DIA]: [atividade('a1', 'Fresagem na Rua 1', 'Produção')] },
  pluviometria: { [DIA]: leituraDePluviometro('B', 'C', 'I', 8) },
  observacoes: { [DIA]: [observacao('o1', 'Frente liberada pela fiscalização.')] },
  periodos: [{ numero: 7, inicial: '2026-09-01', final: '2026-09-30' }],
};

const AJUSTES_DO_PERIODO = {
  dias: [registroTrabalhado(DIA)],
  pessoas: PESSOAL_DE_SETEMBRO,
  equipamentos: EQUIPAMENTOS_DE_SETEMBRO,
  producao: [
    producaoEm('p0', SERVICO_FRESA_CAPA, '2026-09-01', '5'),
    producaoEm('p1', SERVICO_FRESA_CAPA, DIA, '10'),
  ],
  atividades: [atividadeEm('a1', DIA, 'Fresagem na Rua 1', 'Produção')],
  pluviometria: [leituraEm(DIA, 'B', 'C', 'I', 8)],
  observacoes: [observacaoEm('o1', DIA, 'Frente liberada pela fiscalização.')],
};

describe('período de um dia só', () => {
  it('traz o mesmo efetivo que o RDO diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(diario.efetivoPessoal.total).toBe(2);
    expect(periodo.efetivoPessoal.mediaTotal?.toNumber()).toBe(2);
  });

  it('traz o mesmo EXEC. e o mesmo ACUM. que o RDO diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    const doDiario = diario.producao.find((l) => l.servicoId === SERVICO_FRESA_CAPA);
    const doPeriodo = periodo.producao.find((l) => l.servicoId === SERVICO_FRESA_CAPA);

    expect([doDiario?.executadoTexto, doDiario?.acumuladoTexto]).toEqual([
      '10,00',
      '15,00',
    ]);
    expect([doPeriodo?.executadoTexto, doPeriodo?.acumuladoTexto]).toEqual([
      '10,00',
      '15,00',
    ]);
  });

  it('traz o mesmo número de RDO que o diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(diario.identificacao.numeroDoRdo).toBe(209);
    expect(periodo.identificacao.numeroDoRdoInicial).toBe(209);
    expect(periodo.identificacao.numeroDoRdoFinal).toBe(209);
  });

  it('traz as mesmas linhas de atividade que o diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(periodo.atividades[0]?.linhas).toEqual(diario.atividades);
  });

  it('traz o mesmo índice pluviométrico que o diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(diario.pluviometria.indiceTexto).toBe('8 mm');
    expect(periodo.pluviometria.totalMmTexto).toBe('8 mm');
  });

  it('traz as mesmas linhas de comentário que o diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(periodo.comentariosCros[0]?.linhas).toEqual(diario.comentariosCros.linhas);
  });

  it('traz o mesmo BMS que o diário daquele dia', async () => {
    const diario = await montaOuFalha(DIA, AJUSTES_DO_DIARIO);
    const periodo = await montaPeriodoOuFalha([DIA], AJUSTES_DO_PERIODO);

    expect(diario.identificacao.bms).toBe(7);
    expect(periodo.identificacao.bmsTexto).toBe('7');
  });
});
