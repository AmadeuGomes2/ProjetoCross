/**
 * O documento do consolidado de período — blocos, ordem e rótulos.
 *
 * Origem das expectativas, nesta ordem:
 *
 * - `.claude/skills/fidelidade-documento/SKILL.md`, que é o gabarito: a ordem
 *   dos 11 blocos e a grafia herdada de cada rótulo, erros de ortografia
 *   inclusive;
 * - as **cinco respostas do dono do produto de 17/09/2026** aos pontos A1 a A5
 *   de `docs/arquitetura/periodo.md`, seção 6: `RDO Nº` é a **lista** dos
 *   números e nunca faixa; `DATA` recebe a faixa no mesmo campo; `DIA` recebe a
 *   quantidade de dias; a pluviometria ganha `DIAS BONS`, `DIAS CHUVOSOS`,
 *   `DIAS IMPRATIC.` e `DIAS PARADOS`; o título do efetivo ganha
 *   `· MÉDIA POR DIA` depois do rótulo herdado inteiro;
 * - o contrato, seção 2.5 e 2.6: dia não lançado aparece como grupo vazio, e
 *   contador de dias imprime `0`, porque "zero em branco" é regra do efetivo.
 *
 * Nada aqui é lido da implementação: os textos esperados estão escritos por
 * extenso, como o fiscal os lê.
 */

import { describe, expect, it } from 'vitest';

import { montaDocumentoDoRdo } from '../documento/documento-rdo';
import { ROTULO, ROTULO_DE_PERIODO } from '../documento/rotulos';
import { coletaTextos, textoDoDocumento } from '../teste/arvore';
import { montaDocumentoDoConsolidado } from './documento/documento-de-periodo';
import {
  CONSOLIDADO_DE_EXEMPLO,
  consolidadoDeUmDia,
  diarioDe,
} from './teste/duplas-de-periodo';

const textos = (): string[] =>
  coletaTextos(montaDocumentoDoConsolidado(CONSOLIDADO_DE_EXEMPLO));

function posicaoDe(lista: string[], rotulo: string): number {
  const i = lista.indexOf(rotulo);
  if (i < 0) throw new Error(`bloco ausente no documento: ${rotulo}`);
  return i;
}

describe('a ordem dos blocos é a do diário', () => {
  it('imprime os 11 blocos na ordem em que o fiscal lê', () => {
    const lista = textos();
    const ordem = [
      'RELATÓRIO DIÁRIO DE OBRAS',
      'RDO Nº',
      'INFORMAÇÕES GERAIS',
      'CARACTERISTICAS DO PROJETO',
      'EFETIVO PESSOAL · MÉDIA POR DIA',
      'EFETIVO EQUIPAMENTOS · MÉDIA POR DIA',
      'PRODUÇÃO CONTROLADA',
      'ATIVIDADES',
      'PLUVIOMETRIA',
      'COMENTÁRIOS CROS',
      'REPRESENTANTE CROS CONSTRUÇÕES S/A',
    ].map((rotulo) => posicaoDe(lista, rotulo));

    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it('mantém os rótulos herdados com a grafia exata do gabarito', () => {
    // Os erros de ortografia herdados não se corrigem: são o vocabulário do
    // cliente (CLAUDE.md, Fidelidade do documento).
    const texto = textoDoDocumento(montaDocumentoDoConsolidado(CONSOLIDADO_DE_EXEMPLO));
    for (const rotulo of [
      'RELATÓRIO DIÁRIO DE OBRAS',
      "BM'S",
      'RDO Nº',
      'DATA INICIO:',
      'DATA FINAL:',
      'CARACTERISTICAS DO PROJETO',
      'PRODUÇÃO CONTROLADA',
      'EXEC.',
      'ACUM.',
      'PROJETO',
      'ATIVIDADES',
      'STATUS',
      'PLUVIOMETRIA',
      'INDICE',
      'COMENTÁRIOS CROS',
      'COMENTÁRIO CONTRATANTE',
      'REPRESENTANTE CROS CONSTRUÇÕES S/A',
      'REPRESENTANTE CONTRATANTE',
    ]) {
      expect(texto).toContain(rotulo);
    }
  });
});

describe('nenhum rótulo herdado mudou de grafia', () => {
  it('o cadastro de rótulos continua igual ao gabarito', () => {
    // Escrito a partir da skill `fidelidade-documento`, bloco a bloco, e não
    // lido de `rotulos.ts`: é este teste que trava a grafia.
    expect(ROTULO).toMatchObject({
      TITULO: 'RELATÓRIO DIÁRIO DE OBRAS',
      BMS: "BM'S",
      NUMERO_DO_RDO: 'RDO Nº',
      INFORMACOES_GERAIS: 'INFORMAÇÕES GERAIS',
      CONTRATO: 'CONTRATO:',
      DATA_INICIO: 'DATA INICIO:',
      DATA_FINAL: 'DATA FINAL:',
      CONTRATANTE: 'CONTRATANTE:',
      CONTRATADA: 'CONTRATADA:',
      ESCOPO: 'ESCOPO:',
      CARACTERISTICAS: 'CARACTERISTICAS DO PROJETO',
      NOME: 'NOME:',
      AREA: 'ÁREA:',
      LOCAL: 'LOCAL:',
      EFETIVO_PESSOAL: 'EFETIVO PESSOAL',
      EFETIVO_EQUIPAMENTOS: 'EFETIVO EQUIPAMENTOS',
      TOTAL: 'TOTAL',
      PRODUCAO_CONTROLADA: 'PRODUÇÃO CONTROLADA',
      SERVICO: 'SERVIÇO',
      EXEC: 'EXEC.',
      ACUM: 'ACUM.',
      PROJETO: 'PROJETO',
      ATIVIDADES: 'ATIVIDADES',
      STATUS: 'STATUS',
      PLUVIOMETRIA: 'PLUVIOMETRIA',
      NOITE_ANTERIOR: 'NOITE ANTER',
      MANHA: 'MANHÃ',
      TARDE: 'TARDE',
      INDICE: 'INDICE',
      COMENTARIOS_CROS: 'COMENTÁRIOS CROS',
      COMENTARIO_CONTRATANTE: 'COMENTÁRIO CONTRATANTE',
      REPRESENTANTE_CROS: 'REPRESENTANTE CROS CONSTRUÇÕES S/A',
      REPRESENTANTE_CONTRATANTE: 'REPRESENTANTE CONTRATANTE',
      CONTINUACAO: 'CONTINUAÇÃO',
    });
  });

  it('o rótulo herdado do efetivo continua inteiro, na frente do complemento', () => {
    // Resposta 5 de 17/09/2026: o complemento se acrescenta, não substitui.
    expect(ROTULO_DE_PERIODO.EFETIVO_PESSOAL_MEDIA).toBe(
      'EFETIVO PESSOAL · MÉDIA POR DIA',
    );
    expect(ROTULO_DE_PERIODO.EFETIVO_EQUIPAMENTOS_MEDIA).toBe(
      'EFETIVO EQUIPAMENTOS · MÉDIA POR DIA',
    );
    expect(
      ROTULO_DE_PERIODO.EFETIVO_PESSOAL_MEDIA.startsWith(ROTULO.EFETIVO_PESSOAL),
    ).toBe(true);
    expect(
      ROTULO_DE_PERIODO.EFETIVO_EQUIPAMENTOS_MEDIA.startsWith(
        ROTULO.EFETIVO_EQUIPAMENTOS,
      ),
    ).toBe(true);
  });
});

describe('RDO Nº é a lista dos números, nunca faixa', () => {
  it('imprime 209, 212, 216 no conjunto não contíguo', () => {
    // Resposta 1 de 17/09/2026. A faixa afirmaria continuidade onde o conjunto
    // tem buraco, e o fiscal leria oito dias onde houve três.
    const lista = textos();
    expect(lista[posicaoDe(lista, ROTULO.NUMERO_DO_RDO) + 1]).toBe('209, 212, 216');
  });

  it('não imprime faixa de número de RDO em lugar nenhum', () => {
    const texto = textoDoDocumento(montaDocumentoDoConsolidado(CONSOLIDADO_DE_EXEMPLO));
    expect(texto).not.toContain('209 a 216');
    expect(texto).not.toContain('209 a 212');
  });

  it('com um dia só, imprime o número sozinho, sem vírgula', () => {
    const umDia = consolidadoDeUmDia(diarioDe('2026-09-03', 210));
    const lista = coletaTextos(montaDocumentoDoConsolidado(umDia));
    expect(lista[posicaoDe(lista, ROTULO.NUMERO_DO_RDO) + 1]).toBe('210');
  });
});

describe('DATA e DIA, no campo herdado', () => {
  it('a faixa de datas ocupa o campo da data, sem rótulo novo', () => {
    // Resposta 2 de 17/09/2026.
    expect(textos()).toContain('02/09/2026 a 09/09/2026');
  });

  it('o campo DIA recebe a quantidade de dias do conjunto', () => {
    // Resposta 3 de 17/09/2026: `6 dias` para seis dias; aqui são três.
    const lista = textos();
    expect(lista).toContain(ROTULO_DE_PERIODO.DIA);
    expect(lista).toContain('3 dias');
  });

  it('com um dia só, o campo DIA fica no singular', () => {
    // Fronteira da contagem: `1 dias` não é português, e o campo é lido pelo
    // fiscal a cada exportação de um dia isolado.
    const umDia = consolidadoDeUmDia(diarioDe('2026-09-03', 210));
    expect(coletaTextos(montaDocumentoDoConsolidado(umDia))).toContain('1 dia');
  });
});

describe('pluviometria do período', () => {
  it('imprime os quatro rótulos novos com a grafia aprovada', () => {
    // Resposta 4 de 17/09/2026. `IMPRATIC.` é abreviado assim, com ponto.
    const lista = textos();
    for (const rotulo of [
      'DIAS BONS',
      'DIAS CHUVOSOS',
      'DIAS IMPRATIC.',
      'DIAS PARADOS',
    ]) {
      expect(lista).toContain(rotulo);
    }
  });

  it('mantém INDICE sem acento, com a unidade', () => {
    const lista = textos();
    expect(lista).toContain('INDICE');
    expect(lista).toContain('12 mm');
  });

  it('imprime 0 no contador zerado, e não em branco', () => {
    // Contrato, 2.6: "zero em branco" é regra do efetivo, não de contador de
    // dias. O fiscal precisa ler que houve zero dia impraticável.
    const lista = textos();
    const i = posicaoDe(lista, 'DIAS IMPRATIC.');
    expect(lista[i + 1]).toBe('0');
  });

  it('não imprime os três turnos do diário, que não existem no período', () => {
    const texto = textoDoDocumento(montaDocumentoDoConsolidado(CONSOLIDADO_DE_EXEMPLO));
    expect(texto).not.toContain('NOITE ANTER');
    expect(texto).not.toContain('MANHÃ');
    expect(texto).not.toContain('TARDE');
  });
});

describe('atividades e comentários, por data', () => {
  it('separa os grupos pela data, em ordem crescente', () => {
    const lista = textos();
    const inicio = posicaoDe(lista, 'ATIVIDADES');
    const daAtividade = lista.slice(inicio);
    const ordem = ['02/09/2026', '05/09/2026', '09/09/2026'].map((data) =>
      posicaoDe(daAtividade, data),
    );
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it('o dia não lançado aparece com a data e sem linha nenhuma', () => {
    // Contrato, 2.5: o grupo vazio não some da lista; sumir seria corte
    // silencioso, e quem lê deduziria o buraco na sequência.
    const lista = textos();
    const inicio = posicaoDe(lista, 'ATIVIDADES');
    const daAtividade = lista.slice(inicio);
    const doDiaNaoLancado = daAtividade.indexOf('05/09/2026');
    expect(daAtividade[doDiaNaoLancado + 1]).toBe('09/09/2026');
  });

  it('não deduplica atividade repetida em dias diferentes', () => {
    // DP3: todas, por data. Duas atividades com o mesmo texto em dias
    // diferentes são duas linhas.
    const consolidado = {
      ...CONSOLIDADO_DE_EXEMPLO,
      atividades: [
        {
          chave: 'd1',
          data: '02/09/2026',
          linhas: [{ chave: 'a-1', descricao: 'Fresagem', status: 'Produção' }],
        },
        {
          chave: 'd2',
          data: '05/09/2026',
          linhas: [{ chave: 'a-2', descricao: 'Fresagem', status: 'Produção' }],
        },
      ],
    };
    const lista = coletaTextos(montaDocumentoDoConsolidado(consolidado));
    expect(lista.filter((texto) => texto === 'Fresagem')).toHaveLength(2);
  });

  it('o bloco do contratante aparece e sai vazio', () => {
    // Decisão 10.1: o bloco aparece com o rótulo, o conteúdo não existe na v1.
    const lista = textos();
    const i = posicaoDe(lista, 'COMENTÁRIO CONTRATANTE');
    expect(lista.slice(i + 1)).not.toContain('Frente liberada');
  });
});

describe('o consolidado de um dia só é comparável ao diário do mesmo dia', () => {
  const diario = diarioDe('2026-09-03', 210);
  const doDiario = coletaTextos(montaDocumentoDoRdo(diario));
  const doPeriodo = coletaTextos(montaDocumentoDoConsolidado(consolidadoDeUmDia(diario)));

  it('repete os mesmos valores de produção', () => {
    for (const valor of [
      'REC.(FRESA+CAPA)',
      '234,50',
      '15.027,03',
      '2.210,39',
      '55,85%',
    ]) {
      expect(doDiario).toContain(valor);
      expect(doPeriodo).toContain(valor);
    }
  });

  it('repete as mesmas atividades, com o mesmo status', () => {
    expect(doDiario).toContain('Fresagem');
    expect(doPeriodo).toContain('Fresagem');
    expect(doPeriodo).toContain('Produção');
  });

  it('repete o mesmo efetivo, porque a média de um dia é o efetivo do dia', () => {
    const totalDoDiario = doDiario[posicaoDe(doDiario, 'TOTAL') + 1];
    const totalDoPeriodo = doPeriodo[posicaoDe(doPeriodo, 'TOTAL') + 1];
    expect(totalDoPeriodo).toBe(totalDoDiario);
  });

  it('repete as mesmas informações gerais e características do projeto', () => {
    for (const valor of [
      'P0476/01-25 - BLOCO 02',
      '05/02/2026',
      'CROS CONSTRUÇÕES S.A.',
      'SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02',
    ]) {
      expect(doDiario).toContain(valor);
      expect(doPeriodo).toContain(valor);
    }
  });

  it('traz o mesmo número de RDO nos dois documentos', () => {
    expect(doDiario).toContain('210');
    expect(doPeriodo).toContain('210');
  });
});
