/**
 * A leitura que alimenta o RDO de período: **um instantâneo, um conjunto**.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/arquitetura/periodo.md`, DP1: "a entrada é um **conjunto de dias**,
 *   não um intervalo. 'Três RDOs' pode ser 02, 05 e 09, não contíguos". Daí o
 *   primeiro caso: o dia 03 existe, foi lançado, e não pode entrar;
 * - `docs/arquitetura/periodo.md`, 1.2, item 3: "dia repetido dobraria `EXEC.`
 *   e o total de mm". Daí o caso do dia repetido no pedido;
 * - `docs/arquitetura/periodo.md`, DP6: `ACUM.` é o acumulado da obra até o
 *   **último dia** do conjunto, sobre todos os dias, inclusive os que não estão
 *   nele. Daí o caso da produção do dia 03 entrar e a do dia 12 não;
 * - `docs/arquitetura/periodo.md`, 2.5: "dia `não lançado` gera grupo vazio,
 *   não some da lista... o leitor precisa ver que 05/09 não foi lançado";
 *   decisão 4.2 (`regras-rdo` §5) separa **não lançado** de **parado**;
 * - decisão 30.1 (`CLAUDE.md`, Modelo): excluir não apaga linha, e o que foi
 *   excluído com rastro não entra em documento nenhum;
 * - decisão 22.1 (`regras-rdo` §5): retificação encadeada — o RDO mostra a
 *   versão vigente, e as duas ficam no histórico;
 * - `docs/arquitetura/v1.md`, 5.2: toda leitura filtra por `obra_id`. Nenhum
 *   lançamento de outra obra atravessa.
 *
 * Dado sintético, sempre. Nenhum nome de pessoa (CLAUDE.md, Segurança).
 */

import { describe, expect, it } from 'vitest';

import type { DiaPuro } from '../../shared/date/dia';
import { criaLeituraDePeriodo, type InstantaneoDoPeriodo } from './leitura-de-periodo';
import { criaCasosDeLancamento } from './index';
import type { LancamentoAceito } from './tipos';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  E1,
  E2,
  OBRA_B02,
  OBRA_OUTRA,
  quantidade,
  relogioQueAvanca,
} from './teste/duplas';

const AGORA = '2026-09-16T12:00:00.000Z';

const D02 = dia('2026-09-02');
const D03 = dia('2026-09-03');
const D05 = dia('2026-09-05');
const D09 = dia('2026-09-09');
const D10 = dia('2026-09-10');
const D12 = dia('2026-09-12');

/** O conjunto não contíguo do contrato: 02, 05 e 09. */
const CONJUNTO = [D02, D05, D09];

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioQueAvanca(AGORA),
  });
  const leitura = criaLeituraDePeriodo({ repositorio, status: portas.status });
  return { repositorio, portas, casos, leitura };
}

type Montagem = ReturnType<typeof monta>;

function exige<T>(resultado: { ok: boolean }, oQue: string): T {
  if (!resultado.ok) {
    const comErro = resultado as { erro?: { mensagem?: string } };
    throw new Error(`${oQue}: ${comErro.erro?.mensagem ?? 'recusado'}`);
  }
  return (resultado as unknown as { valor: T }).valor;
}

async function lancaAtividade(
  m: Montagem,
  data: DiaPuro,
  descricao: string,
  obraId = OBRA_B02,
  autor = C1,
): Promise<LancamentoAceito> {
  return exige<LancamentoAceito>(
    await m.casos.lancaAtividade(
      {
        obraId,
        data,
        descricao,
        status: { tipo: 'id', id: m.portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: autor },
    ),
    `atividade ${descricao}`,
  );
}

async function lancaProducao(
  m: Montagem,
  data: DiaPuro,
  valor: string,
): Promise<LancamentoAceito> {
  return exige<LancamentoAceito>(
    await m.casos.lancaProducao(
      {
        obraId: OBRA_B02,
        data,
        servico: { tipo: 'id', id: m.portas.idDoServico('REC.(FRESA+CAPA)') },
        quantidade: quantidade(valor),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    ),
    'produção',
  );
}

async function instantaneo(
  m: Montagem,
  dias: readonly DiaPuro[] = CONJUNTO,
  obraId = OBRA_B02,
): Promise<InstantaneoDoPeriodo> {
  return exige<InstantaneoDoPeriodo>(
    await m.leitura.instantaneoDoPeriodo(obraId, dias),
    'instantâneo do período',
  );
}

describe('o conjunto manda: só os dias pedidos, e nenhum vizinho', () => {
  it('não traz o dia lançado que ficou entre dois dias do conjunto', async () => {
    const m = monta();
    await lancaAtividade(m, D02, 'Fresagem da Rua A');
    await lancaAtividade(m, D03, 'Fresagem da Rua B');
    await lancaAtividade(m, D05, 'Fresagem da Rua C');
    await lancaAtividade(m, D09, 'Fresagem da Rua D');

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.descricao)).toEqual([
      'Fresagem da Rua A',
      'Fresagem da Rua C',
      'Fresagem da Rua D',
    ]);
  });

  it('não traz o dia seguinte ao último do conjunto', async () => {
    const m = monta();
    await lancaAtividade(m, D09, 'Fresagem da Rua D');
    await lancaAtividade(m, D10, 'Fresagem da Rua E');

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.data)).toEqual([D09]);
  });

  it('ordena por dia crescente, mesmo quando o dia 09 foi lançado primeiro', async () => {
    const m = monta();
    await lancaAtividade(m, D09, 'Lançada primeiro, do dia 09');
    await lancaAtividade(m, D02, 'Lançada depois, do dia 02');

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.data)).toEqual([D02, D09]);
  });

  it('não duplica quando o pedido repete um dia', async () => {
    const m = monta();
    await lancaAtividade(m, D02, 'Fresagem da Rua A');

    const lido = await instantaneo(m, [D02, D02, D05]);

    expect(lido.diasConsultados).toEqual([D02, D05]);
    expect(lido.atividades).toHaveLength(1);
  });

  it('devolve instantâneo vazio para conjunto vazio', async () => {
    const m = monta();
    await lancaAtividade(m, D02, 'Fresagem da Rua A');

    const lido = await instantaneo(m, []);

    expect(lido.diasConsultados).toEqual([]);
    expect(lido.dias).toEqual([]);
    expect(lido.atividades).toEqual([]);
    expect(lido.ate).toBeNull();
  });

  it('não traz lançamento de outra obra no mesmo dia', async () => {
    const m = monta();
    await lancaAtividade(m, D05, 'Da obra do conjunto');
    await lancaAtividade(m, D05, 'De outra obra', OBRA_OUTRA, E2);

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.descricao)).toEqual(['Da obra do conjunto']);
  });
});

describe('dia sem lançamento nenhum é ausência, não zero inventado', () => {
  it('lista o dia pedido em diasConsultados e não inventa registro para ele', async () => {
    const m = monta();
    await lancaAtividade(m, D02, 'Fresagem da Rua A');

    const lido = await instantaneo(m, [D02, D05]);

    expect(lido.diasConsultados).toEqual([D02, D05]);
    expect(lido.dias.map((d) => d.data)).toEqual([D02]);
    expect(lido.atividades.map((a) => a.data)).toEqual([D02]);
  });

  it('distingue o dia parado, que tem registro e motivo, do dia não lançado', async () => {
    const m = monta();
    exige(
      await m.casos.declaraEstadoDoDia(
        {
          obraId: OBRA_B02,
          data: D05,
          estado: 'parado',
          motivoParada: 'Chuva',
        },
        { usuarioId: C1 },
      ),
      'dia parado',
    );

    const lido = await instantaneo(m, [D05, D09]);

    expect(lido.dias).toHaveLength(1);
    expect(lido.dias[0]?.data).toBe(D05);
    expect(lido.dias[0]?.estado).toBe('parado');
    expect(lido.dias[0]?.motivoParada).toBe('Chuva');
  });
});

describe('o portão da vigência vale no período inteiro', () => {
  it('não traz a atividade excluída com rastro', async () => {
    const m = monta();
    const excluida = await lancaAtividade(m, D02, 'Lançada por engano');
    await lancaAtividade(m, D02, 'Fresagem da Rua A');
    exige(
      await m.casos.excluiLancamento(
        {
          obraId: OBRA_B02,
          lancamentoId: excluida.id,
          tipo: 'atividade',
          motivo: 'Lançada na data errada; refeita no dia certo.',
        },
        { usuarioId: E1 },
      ),
      'exclusão',
    );

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.descricao)).toEqual(['Fresagem da Rua A']);
    // A linha continua no repositório: excluir não apaga (30.1).
    expect(m.repositorio.atividades.linhas).toHaveLength(2);
  });

  it('traz só a versão vigente da cadeia de retificação, nunca as duas', async () => {
    const m = monta();
    const original = await lancaAtividade(m, D02, 'Fresagem da Rua A');
    exige(
      await m.casos.fechaDia({ obraId: OBRA_B02, data: D02 }, { usuarioId: E1 }),
      'fechamento do dia',
    );
    exige(
      await m.casos.retificaLancamento(
        {
          obraId: OBRA_B02,
          lancamentoId: original.id,
          conteudo: {
            tipo: 'atividade',
            descricao: 'Fresagem da Rua A, trecho 2',
            status: { tipo: 'id', id: m.portas.idDoStatus('Produção') },
          },
        },
        { usuarioId: E1 },
      ),
      'retificação',
    );

    const lido = await instantaneo(m);

    expect(lido.atividades.map((a) => a.descricao)).toEqual([
      'Fresagem da Rua A, trecho 2',
    ]);
    expect(m.repositorio.atividades.linhas).toHaveLength(2);
  });

  it('traz uma leitura de pluviometria por dia, e nenhuma no dia sem leitura', async () => {
    const m = monta();
    exige(
      await m.casos.lancaPluviometria(
        {
          obraId: OBRA_B02,
          data: D02,
          noiteAnterior: 'B',
          manha: 'C',
          tarde: 'B',
          indiceMm: quantidade('12'),
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      ),
      'pluviometria do dia 02',
    );
    // Relançar o dia aberto corrige a leitura: continua existindo UMA por dia.
    exige(
      await m.casos.lancaPluviometria(
        {
          obraId: OBRA_B02,
          data: D02,
          noiteAnterior: 'B',
          manha: 'I',
          tarde: 'B',
          indiceMm: quantidade('20'),
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      ),
      'correção da pluviometria do dia 02',
    );

    const lido = await instantaneo(m);

    expect(lido.pluviometria).toHaveLength(1);
    expect(lido.pluviometria[0]?.data).toBe(D02);
    expect(lido.pluviometria[0]?.manha).toBe('I');
  });

  it('traz as observações por data, e não a excluída', async () => {
    const m = monta();
    exige(
      await m.casos.lancaObservacao(
        {
          obraId: OBRA_B02,
          data: D05,
          texto: 'Frente liberada pela fiscalização.',
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      ),
      'observação do dia 05',
    );
    const aExcluir = exige<LancamentoAceito>(
      await m.casos.lancaObservacao(
        {
          obraId: OBRA_B02,
          data: D05,
          texto: 'Texto lançado por engano.',
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      ),
      'observação a excluir',
    );
    exige(
      await m.casos.excluiLancamento(
        {
          obraId: OBRA_B02,
          lancamentoId: aExcluir.id,
          tipo: 'observacao',
          motivo: 'Texto repetido no mesmo dia.',
        },
        { usuarioId: E1 },
      ),
      'exclusão da observação',
    );

    const lido = await instantaneo(m);

    expect(lido.observacoes.map((o) => o.texto)).toEqual([
      'Frente liberada pela fiscalização.',
    ]);
  });
});

describe('a produção do instantâneo é a base do EXEC. e do ACUM.', () => {
  it('acumula até o último dia do conjunto, inclusive o dia que ficou de fora', async () => {
    const m = monta();
    await lancaProducao(m, D02, '100');
    // O dia 03 não está no conjunto: fora do EXEC., dentro do ACUM. (DP6).
    await lancaProducao(m, D03, '30');
    await lancaProducao(m, D09, '70');

    const lido = await instantaneo(m, [D02, D09]);

    expect(lido.ate).toBe(D09);
    expect(lido.producaoAte.map((p) => p.data)).toEqual([D02, D03, D09]);
  });

  it('não acumula produção lançada depois do último dia do conjunto', async () => {
    const m = monta();
    await lancaProducao(m, D09, '70');
    await lancaProducao(m, D12, '999');

    const lido = await instantaneo(m, [D02, D09]);

    expect(lido.producaoAte.map((p) => p.data)).toEqual([D09]);
  });

  it('não acumula produção excluída com rastro', async () => {
    const m = monta();
    await lancaProducao(m, D02, '100');
    const aExcluir = await lancaProducao(m, D03, '30');
    exige(
      await m.casos.excluiLancamento(
        {
          obraId: OBRA_B02,
          lancamentoId: aExcluir.id,
          tipo: 'producao',
          motivo: 'Medição refeita depois da conferência do trecho.',
        },
        { usuarioId: E1 },
      ),
      'exclusão da produção',
    );

    const lido = await instantaneo(m, [D02, D09]);

    expect(lido.producaoAte.map((p) => p.data)).toEqual([D02]);
  });
});
