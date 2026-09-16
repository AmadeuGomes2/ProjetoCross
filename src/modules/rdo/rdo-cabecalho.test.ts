/**
 * CT-170 a CT-180 — cabeçalho do RDO diário.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.1 do PRD.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 * - número do RDO = `dia − data de início`, decisão 6.1 (primeiro dia é 0) e
 *   R4; congelamento no fechamento, decisão 6.2;
 * - BMS derivado do período que contém a data, decisão 7.1 e 21.1;
 * - data fora do período do contrato não gera RDO, decisão 23.1;
 * - data inexistente no calendário é recusada na borda, caso obrigatório 10.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { interpretaPedidoDeRdo } from './borda/esquemas';
import { montaRdoDiario } from './monta-rdo-diario';
import { calculaNumeroDoRdo } from './numero-do-rdo';
import {
  atividade,
  CABECALHO_PADRAO,
  criaPortasFalsas,
  dia,
  diaFechado,
  OBRA,
} from './teste/duplas';
import { montaOuFalha } from './teste/ajuda';

const INICIO = dia('2026-02-05');

describe('número do RDO (R4, decisões 6.1 e 6.2)', () => {
  it('conta 208 dias entre o início do contrato e 01/09/2026', () => {
    // CT-170. 208 é o número que o fiscal reconhece na planilha real.
    expect(calculaNumeroDoRdo(INICIO, dia('2026-09-01'), null).numero).toBe(208);
  });

  it('numera o primeiro dia do contrato como 0', () => {
    // CT-171, fronteira. Decisão 6.1: o primeiro dia é o RDO 0.
    expect(calculaNumeroDoRdo(INICIO, INICIO, null).numero).toBe(0);
  });

  it('conta dia corrido: o domingo vale 1 a mais que o sábado anterior', () => {
    // CT-172, fronteira. 06/09/2026 é domingo; dia corrido, não dia útil.
    const sabado = calculaNumeroDoRdo(INICIO, dia('2026-09-05'), null).numero;
    const domingo = calculaNumeroDoRdo(INICIO, dia('2026-09-06'), null).numero;
    expect(domingo).toBe(sabado + 1);
  });

  it('usa o número congelado quando o dia está fechado', () => {
    // Decisão 6.2: fechado o dia, o número não muda mais, nem se a data de
    // início da obra for corrigida depois. Aqui o início mudaria o cálculo para
    // 208, e o número entregue ao fiscal foi 205.
    const r = calculaNumeroDoRdo(INICIO, dia('2026-09-01'), 205);
    expect(r).toEqual({ numero: 205, congelado: true });
  });

  it('marca o número como derivado enquanto o dia está aberto', () => {
    expect(calculaNumeroDoRdo(INICIO, dia('2026-09-01'), null).congelado).toBe(false);
  });
});

describe('cabeçalho de identificação', () => {
  it('mostra data, dia da semana e número do RDO de 01/09/2026', async () => {
    // CT-170.
    const rdo = await montaOuFalha('2026-09-01');
    expect(rdo.identificacao.dataBr).toBe('01/09/2026');
    expect(rdo.identificacao.diaDaSemana).toBe('Terça-Feira');
    expect(rdo.identificacao.numeroDoRdo).toBe(208);
  });

  it('mostra a data em pt-BR e nunca no formato americano', async () => {
    // CT-180, caso obrigatório 15: 03/09 e 09/03 trocam de significado.
    const rdo = await montaOuFalha('2026-09-03');
    expect(rdo.identificacao.dataBr).toBe('03/09/2026');
    expect(rdo.identificacao.dataBr).not.toBe('09/03/2026');
  });

  it('usa o número congelado do dia fechado no cabeçalho', async () => {
    const rdo = await montaOuFalha('2026-09-01', {
      dias: { '2026-09-01': diaFechado(205) },
    });
    expect(rdo.identificacao.numeroDoRdo).toBe(205);
    expect(rdo.identificacao.numeroCongelado).toBe(true);
  });
});

describe("campo BM'S (decisões 7.1 e 21.1)", () => {
  it('mostra o número do período que contém a data', async () => {
    // CT-173: períodos 6 (01/08 a 31/08) e 7 (01/09 a 30/09).
    const rdo = await montaOuFalha('2026-09-01');
    expect(rdo.identificacao.bms).toBe(7);
  });

  it('inclui o último dia do período no próprio período', async () => {
    // CT-174, fronteira: o fim do intervalo é inclusivo, e é o dia do
    // fechamento da medição.
    const rdo = await montaOuFalha('2026-08-31');
    expect(rdo.identificacao.bms).toBe(6);
  });

  it('deixa o campo vazio e avisa quando nenhum período cobre a data', async () => {
    // CT-175: vazio com aviso; erro ou bloqueio puniria o fiscal por cadastro
    // incompleto do engenheiro.
    const rdo = await montaOuFalha('2026-08-15', {
      periodos: [{ numero: 1, inicial: '2026-02-05', final: '2026-02-28' }],
    });
    expect(rdo.identificacao.bms).toBeNull();
    expect(rdo.avisos.map((a) => a.codigo)).toContain('BMS_SEM_PERIODO');
  });
});

describe('informações gerais e características do projeto', () => {
  it('lê contrato e datas do cadastro da obra', async () => {
    // CT-176: blocos 3 e 4 são leitura do cadastro, iguais em todos os dias.
    const rdo = await montaOuFalha('2026-09-01');
    expect(rdo.informacoesGerais.contrato).toBe('P0476/01-25 - BLOCO 02');
    expect(rdo.informacoesGerais.dataInicio).toBe('05/02/2026');
    expect(rdo.informacoesGerais.dataFinal).toBe('05/02/2027');
  });

  it('recorta o espaço do fim do texto fixo e preserva o do meio', async () => {
    // CT-255 e decisão 17.1: pontas normalizadas, espaço do meio preservado.
    const rdo = await montaOuFalha('2026-09-01', {
      cabecalho: { ...CABECALHO_PADRAO, area: 'MONTES CLAROS - MG ' },
    });
    expect(rdo.caracteristicasDoProjeto.area).toBe('MONTES CLAROS - MG');
    expect(rdo.caracteristicasDoProjeto.nome).toBe(
      'SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02',
    );
  });
});

describe('data fora do contrato e data inexistente', () => {
  it('não gera RDO para dia anterior ao início da obra', async () => {
    // Decisão 23.1: a tela diz que a data está fora do contrato. Sem isso o
    // número do RDO sairia negativo.
    const r = await montaRdoDiario(OBRA, dia('2026-02-04'), criaPortasFalsas());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.codigo).toBe(CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA);
    }
  });

  it('não gera RDO para dia posterior ao término da obra', async () => {
    const r = await montaRdoDiario(OBRA, dia('2027-02-06'), criaPortasFalsas());
    expect(r.ok).toBe(false);
  });

  it('gera RDO no último dia do contrato', async () => {
    // Fronteira do outro lado: o término é inclusivo.
    const rdo = await montaOuFalha('2027-02-05');
    expect(rdo.identificacao.dataBr).toBe('05/02/2027');
  });

  it('recusa 31 de setembro na borda, com mensagem sobre a data', () => {
    // CT-177, caso obrigatório 10: a aba `31` imprime um RDO de 01/10/2026.
    const r = interpretaPedidoDeRdo({ obraId: 'B02', dia: '2026-09-31' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('aceita 28/02/2026 e recusa 29/02/2026', () => {
    // CT-179: 2026 não é bissexto.
    expect(interpretaPedidoDeRdo({ obraId: 'B02', dia: '2026-02-28' }).ok).toBe(true);
    expect(interpretaPedidoDeRdo({ obraId: 'B02', dia: '2026-02-29' }).ok).toBe(false);
  });

  it('recusa entrada que não é dia puro', () => {
    expect(interpretaPedidoDeRdo({ obraId: 'B02', dia: '03/09/2026' }).ok).toBe(false);
    expect(interpretaPedidoDeRdo({ obraId: '', dia: '2026-09-03' }).ok).toBe(false);
    expect(interpretaPedidoDeRdo({ dia: '2026-09-03' }).ok).toBe(false);
  });
});

describe('mês de referência (CT-178, caso obrigatório 12)', () => {
  it('mostra só o dia consultado, sem vazar o dia seguinte', async () => {
    const rdo = await montaOuFalha('2026-09-30', {
      atividades: {
        '2026-09-30': [atividade('a-1', 'Fresagem', 'Produção')],
        '2026-10-01': [atividade('a-2', 'Serviço de outubro', 'Produção')],
      },
    });
    const descricoes = rdo.atividades.map((l) =>
      l.tipo === 'atividade' ? l.descricao : l.motivo,
    );
    expect(descricoes).toEqual(['Fresagem']);
  });
});
