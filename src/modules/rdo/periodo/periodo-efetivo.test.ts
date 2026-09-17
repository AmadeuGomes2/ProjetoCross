/**
 * Efetivo médio do RDO de período — blocos 5 e 6.
 *
 * Origem das expectativas:
 * - `docs/arquitetura/periodo.md`, DP2: efetivo é **média por dia**, e dia não
 *   lançado **não entra no divisor**;
 * - decisão 5.1 (`.claude/skills/regras-rdo/SKILL.md`, §1): dia parado tem
 *   efetivo zero. Somada a DP2, o dia parado **entra** no divisor somando zero
 *   e puxa a média para baixo;
 * - decisão 1.1 (§1): a pessoa conta no dia em que sai;
 * - `periodo.md`, 2.3 ponto 3: `mediaTotal` sai dos **totais diários**, nunca
 *   da soma das médias já arredondadas das colunas;
 * - gabarito, bloco 5: quantidade zero é exibida em branco.
 *
 * Nenhum valor esperado aqui foi lido da implementação: cada um é a conta feita
 * à mão sobre o cadastro sintético de `teste/duplas-de-periodo.ts`.
 */

import { describe, expect, it } from 'vitest';

import { AVISO_DO_PERIODO } from './tipos';
import {
  dia,
  FUNCAO_MOTORISTA,
  FUNCAO_PEDREIRO,
  FUNCAO_TOPOGRAFO,
  registroParado,
  registroTrabalhado,
} from './teste/duplas-de-periodo';
import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';
import { idConfiavel, type PessoaId } from '../../../shared/id';
import type { PessoaMobilizada } from '../portas';

/**
 * Efetivo de pessoal, dia a dia, no cadastro sintético de setembro:
 *
 *   01/09  Motorista 1 (PA)   Pedreiro 1 (PC)   total 2
 *   02/09  Motorista 1 (PA)   Pedreiro 1 (PC, dia da saída)   total 2
 *   03/09  Motorista 1 (PA)   Pedreiro 0        total 1
 *   04/09  Motorista 2 (PA,PB) Pedreiro 0       total 2
 */
describe('efetivo pessoal médio', () => {
  it('exclui do divisor o dia que ninguém lançou', async () => {
    // 01, 02 e 04 lançados; 03 não lançado. Totais diários 2, 2 e 2.
    const rdo = await montaPeriodoOuFalha(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'],
      {
        dias: [
          registroTrabalhado('2026-09-01'),
          registroTrabalhado('2026-09-02'),
          registroTrabalhado('2026-09-04'),
        ],
      },
    );

    expect(rdo.efetivoPessoal.diasConsiderados).toBe(3);
    expect(rdo.efetivoPessoal.mediaTotalTexto).toBe('2,0');
  });

  it('conta o dia parado no divisor, somando efetivo zero', async () => {
    // 01 trabalhado (total 2) e 04 parado (total 0): 2 / 2 = 1.
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-04'], {
      dias: [registroTrabalhado('2026-09-01'), registroParado('2026-09-04', 'Domingo')],
    });

    expect(rdo.efetivoPessoal.diasConsiderados).toBe(2);
    expect(rdo.efetivoPessoal.mediaTotalTexto).toBe('1,0');
  });

  it('não divide por zero quando nenhum dia do conjunto foi lançado', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02'], { dias: [] });

    expect(rdo.efetivoPessoal.diasConsiderados).toBe(0);
    expect(rdo.efetivoPessoal.mediaTotal).toBeNull();
    expect(rdo.efetivoPessoal.mediaTotalTexto).toBe('');
  });

  it('mantém as colunas do cadastro mesmo sem divisor', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02'], { dias: [] });

    expect(rdo.efetivoPessoal.colunas.map((c) => c.chave)).toEqual([
      FUNCAO_MOTORISTA,
      FUNCAO_PEDREIRO,
      FUNCAO_TOPOGRAFO,
    ]);
    expect(rdo.efetivoPessoal.colunas.every((c) => c.mediaPorDia === null)).toBe(true);
  });

  it('avisa que o período não tem divisor para a média', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02'], { dias: [] });

    expect(rdo.avisos.map((a) => a.codigo)).toContain(
      AVISO_DO_PERIODO.PERIODO_SEM_DIA_LANCADO,
    );
  });

  it('calcula a média total sobre os totais diários, não sobre as colunas arredondadas', async () => {
    // Um dia com uma pessoa de cada função e dois dias sem ninguém.
    // Colunas: 1/3 = 0,333 -> "0,3" em cada uma das três, que somadas dão 0,9.
    // Total: (3 + 0 + 0) / 3 = 1 -> "1,0". O resíduo é esperado.
    const umDeCada: readonly PessoaMobilizada[] = [
      pessoaDeUmDia('PX', FUNCAO_MOTORISTA),
      pessoaDeUmDia('PY', FUNCAO_PEDREIRO),
      pessoaDeUmDia('PZ', FUNCAO_TOPOGRAFO),
    ];

    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-02', '2026-09-03'], {
      pessoas: umDeCada,
      dias: [
        registroTrabalhado('2026-09-01'),
        registroTrabalhado('2026-09-02'),
        registroTrabalhado('2026-09-03'),
      ],
    });

    expect(rdo.efetivoPessoal.colunas.map((c) => c.mediaTexto)).toEqual([
      '0,3',
      '0,3',
      '0,3',
    ]);
    expect(rdo.efetivoPessoal.mediaTotalTexto).toBe('1,0');
  });

  it('num período de um dia só, a média é o próprio efetivo do dia', async () => {
    // 04/09: dois motoristas mobilizados (PA e PB), nenhum pedreiro.
    const rdo = await montaPeriodoOuFalha(['2026-09-04'], {
      dias: [registroTrabalhado('2026-09-04')],
    });

    expect(rdo.efetivoPessoal.mediaTotalTexto).toBe('2,0');
  });

  it('exibe em branco a média zero, como o gabarito faz com a quantidade zero', async () => {
    const rdo = await montaPeriodoOuFalha(['2026-09-04'], {
      dias: [registroTrabalhado('2026-09-04')],
    });

    const topografo = rdo.efetivoPessoal.colunas.find(
      (c) => c.chave === FUNCAO_TOPOGRAFO,
    );
    expect(topografo?.somaDoPeriodo).toBe(0);
    expect(topografo?.mediaTexto).toBe('');
  });

  it('deixa a soma e o divisor à vista, para quem quiser refazer a divisão', async () => {
    // Motorista: 1 (01/09) + 1 (02/09) + 2 (04/09) = 4 sobre 3 dias.
    const rdo = await montaPeriodoOuFalha(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'],
      {
        dias: [
          registroTrabalhado('2026-09-01'),
          registroTrabalhado('2026-09-02'),
          registroTrabalhado('2026-09-04'),
        ],
      },
    );

    const motorista = rdo.efetivoPessoal.colunas.find(
      (c) => c.chave === FUNCAO_MOTORISTA,
    );
    expect(motorista?.somaDoPeriodo).toBe(4);
    expect(motorista?.mediaTexto).toBe('1,3');
  });
});

describe('efetivo de equipamento médio', () => {
  it('sai por média por dia, com o dia parado zerando o equipamento', async () => {
    // CF-29 está mobilizado desde 01/09: 1 em 01/09 e 0 em 04/09 (parado).
    const rdo = await montaPeriodoOuFalha(['2026-09-01', '2026-09-04'], {
      dias: [registroTrabalhado('2026-09-01'), registroParado('2026-09-04', 'Chuva')],
    });

    expect(rdo.efetivoEquipamentos.diasConsiderados).toBe(2);
    expect(rdo.efetivoEquipamentos.mediaTotalTexto).toBe('0,5');
  });
});

function pessoaDeUmDia(rotulo: string, funcaoId: string): PessoaMobilizada {
  const pessoaId: PessoaId = idConfiavel(rotulo);
  return {
    pessoaId,
    passagens: [
      {
        funcaoId: idConfiavel(funcaoId),
        entrada: dia('2026-09-01'),
        saida: dia('2026-09-01'),
      },
    ],
  };
}
