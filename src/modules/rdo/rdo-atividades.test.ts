/**
 * CT-208 a CT-213 — bloco 8, atividades do dia.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.4 do PRD.
 *
 * Origem das expectativas:
 * - R11: a ordem é a de registro, não alfabética nem por status;
 * - decisão 4.1: em dia parado o motivo sai na PRIMEIRA linha do bloco, sem
 *   virar atividade e sem carregar status (caso obrigatório 4);
 * - decisão 4.2: `não lançado`, `parado` e `trabalhado` são três estados
 *   diferentes, e os três podem ter o bloco vazio por motivos diferentes;
 * - decisão 12.1: produção sem atividade é aceita e avisada na tela
 *   (caso obrigatório 5);
 * - R10: 15 atividades cabem na página.
 */

import { describe, expect, it } from 'vitest';

import { montaOuFalha } from './teste/ajuda';
import {
  atividade,
  diaParado,
  diaTrabalhado,
  lancamentoDeProducao,
  SERVICO_FRESA_CAPA,
} from './teste/duplas';

describe('atividades do dia trabalhado', () => {
  it('lista as atividades na ordem de registro, com status', async () => {
    // CT-208.
    const rdo = await montaOuFalha('2026-09-03', {
      dias: { '2026-09-03': diaTrabalhado() },
      atividades: {
        '2026-09-03': [
          atividade('a-1', 'Fresagem', 'Produção'),
          atividade('a-2', 'Visita do fiscal', 'Informativo'),
        ],
      },
    });
    expect(rdo.atividades).toEqual([
      {
        tipo: 'atividade',
        lancamentoId: 'a-1',
        descricao: 'Fresagem',
        status: 'Produção',
      },
      {
        tipo: 'atividade',
        lancamentoId: 'a-2',
        descricao: 'Visita do fiscal',
        status: 'Informativo',
      },
    ]);
  });

  it('cabe 15 atividades sem cortar nenhuma', async () => {
    // CT-211, fronteira: 15 é o limite do layout; o máximo real observado é 11.
    const quinze = Array.from({ length: 15 }, (_, i) =>
      atividade(`a-${i}`, `Atividade ${i}`, 'Produção'),
    );
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': quinze },
    });
    expect(rdo.atividades).toHaveLength(15);
    expect(rdo.transbordo.atividades).toHaveLength(0);
    expect(rdo.transbordo.temTransbordo).toBe(false);
  });

  it('não corta a 16.ª atividade: ela vai para o transbordo', async () => {
    // CT-261 na tela: transbordo nunca é truncamento silencioso.
    const dezesseis = Array.from({ length: 16 }, (_, i) =>
      atividade(`a-${i}`, `Atividade ${i}`, 'Produção'),
    );
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': dezesseis },
    });
    expect(rdo.atividades).toHaveLength(16);
    expect(rdo.transbordo.atividades).toHaveLength(1);
    expect(rdo.transbordo.temTransbordo).toBe(true);
  });
});

describe('bloco de atividades no dia parado (decisão 4.1)', () => {
  it('mostra o motivo na primeira linha, sem status e sem atividade', async () => {
    // CT-209, caso obrigatório 4: são 79 linhas reais de dia parado
    // classificadas como `Produção`.
    const rdo = await montaOuFalha('2026-09-06', {
      dias: { '2026-09-06': diaParado('Domingo') },
    });
    expect(rdo.atividades).toEqual([{ tipo: 'motivo-de-parada', motivo: 'Domingo' }]);
    expect(JSON.stringify(rdo.atividades)).not.toContain('Produção');
  });

  it('imprime o motivo em texto livre como foi escrito', async () => {
    // CT-210, decisão 20.1: o motivo é texto livre, não o rótulo de uma das 8
    // sugestões.
    const rdo = await montaOuFalha('2026-09-09', {
      dias: { '2026-09-09': diaParado('Visita técnica da concessionária') },
    });
    expect(rdo.atividades).toEqual([
      { tipo: 'motivo-de-parada', motivo: 'Visita técnica da concessionária' },
    ]);
  });
});

describe('os três estados do bloco vazio (decisão 4.2)', () => {
  it('deixa o bloco vazio, sem motivo, no dia trabalhado sem atividade', async () => {
    // CT-213: é o terceiro estado do bloco vazio.
    const rdo = await montaOuFalha('2026-09-04', {
      dias: { '2026-09-04': diaTrabalhado() },
    });
    expect(rdo.atividades).toHaveLength(0);
    expect(rdo.estadoDoDia).toBe('trabalhado');
    expect(rdo.motivoDaParada).toBeNull();
  });

  it('marca o dia sem registro nenhum como não lançado', async () => {
    const rdo = await montaOuFalha('2026-09-07');
    expect(rdo.estadoDoDia).toBe('nao lancado');
    expect(rdo.atividades).toHaveLength(0);
  });

  it('mostra a produção e avisa quando o dia tem medição e nenhuma atividade', async () => {
    // CT-212, caso obrigatório 5, decisão 12.1: 27/03/2026 é assim no arquivo
    // real; o bloco vazio não pode esconder que houve medição.
    const rdo = await montaOuFalha('2026-03-27', {
      dias: { '2026-03-27': diaTrabalhado() },
      producao: [lancamentoDeProducao('l-9', SERVICO_FRESA_CAPA, '2026-03-27', '2992')],
    });
    const linha = rdo.producao.find((l) => l.nome === 'REC.(FRESA+CAPA)');
    expect(linha?.executadoTexto).toBe('2.992,00');
    expect(rdo.atividades).toHaveLength(0);
    expect(rdo.avisos.map((a) => a.codigo)).toContain('PRODUCAO_SEM_ATIVIDADE');
  });

  it('não avisa de produção sem atividade quando não houve produção', async () => {
    const rdo = await montaOuFalha('2026-09-04', {
      dias: { '2026-09-04': diaTrabalhado() },
    });
    expect(rdo.avisos.map((a) => a.codigo)).not.toContain('PRODUCAO_SEM_ATIVIDADE');
  });
});
