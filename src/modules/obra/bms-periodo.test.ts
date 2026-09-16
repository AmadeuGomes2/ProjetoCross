/**
 * CT-015 a CT-026 — Períodos de BMS (`docs/qa/v1-casos-passos-1-3.md`, F1.2).
 *
 * Origem das expectativas: PRD, Funcionalidade 1.2 e decisões 7.1 e 21.1;
 * `regras-extraidas.md` §8 (`dias = final − inicial + 1`); R25; caso
 * obrigatório 9 (o período de −716 dias de `DADOS!E6`) e caso obrigatório 10
 * (o 31 de setembro da aba `31`).
 *
 * As fronteiras do intervalo — primeiro dia, último dia e a virada entre dois
 * períodos vizinhos — têm teste próprio cada uma, porque é ali que `<` no
 * lugar de `≤` passa despercebido.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraPeriodoBmsProtegido,
  criaObraProtegida,
  listaPeriodosBmsProtegida,
  resolveBmsDoDiaProtegido,
} from '../../app/_composicao/cadastro';
import { diaPuroConfiavel } from '../../shared/date/dia';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { listaPeriodosBms } from './periodo-bms';
import type { Ator } from '../../modules/acesso';
import type { ObraId } from '../../shared/id';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(() => {
  cenario = montaCenario();
  e1 = cenario.novoAtor('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb, {
    // A obra nasce com o período 1; os testes cadastram os demais.
    periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
  });
});

afterEach(() => {
  cenario.fecha();
});

function cadastra(numero: number, dataInicial: string, dataFinal: string) {
  return cadastraPeriodoBmsProtegido(
    e1,
    obraId,
    { numero, dataInicial, dataFinal },
    cenario.amb,
  );
}

describe('F1.2 — períodos de BMS', () => {
  it('CT-015 cadastra o período 7 de 01/09 a 30/09/2026, com duração de 30 dias', () => {
    expect(cadastra(7, '2026-09-01', '2026-09-30').ok).toBe(true);

    const lista = listaPeriodosBmsProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    const periodo = lista.valor.find((p) => p.numero === 7);
    expect(periodo?.dataInicial).toBe('2026-09-01');
    expect(periodo?.dataFinal).toBe('2026-09-30');
    // `final − inicial + 1`. Sem o `+ 1` daria 29, que é o erro clássico.
    expect(periodo?.dias).toBe(30);
  });

  it('CT-016 aceita período de um dia e conta 1 dia, não 0', () => {
    expect(cadastra(2, '2026-03-02', '2026-03-02').ok).toBe(true);

    const lista = listaPeriodosBms(obraId, paraObra(cenario.amb));
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;
    expect(lista.valor.find((p) => p.numero === 2)?.dias).toBe(1);
  });

  it('CT-017 recusa fim anterior ao início e diz o que corrigir', () => {
    const resultado = cadastra(2, '2026-02-28', '2024-03-12');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
    expect(resultado.erro.mensagem).toBe('A data final não pode ser anterior à inicial.');
  });

  it('CT-018 recusa o intervalo real de -716 dias de DADOS!E6', () => {
    expect(cadastra(3, '2024-12-01', '2022-12-15').ok).toBe(false);
  });

  it('CT-019 recusa no servidor o período enviado por um encarregado', () => {
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        '22222222-2222-4222-8222-222222222222',
        obraId,
        c1.usuarioId,
        e1.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const resultado = cadastraPeriodoBmsProtegido(
      c1,
      obraId,
      { numero: 8, dataInicial: '2026-10-01', dataFinal: '2026-10-31' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    const depois = listaPeriodosBms(obraId, paraObra(cenario.amb));
    expect(depois.ok && depois.valor.some((p) => p.numero === 8)).toBe(false);
  });

  it('CT-020 não cria a obra quando nenhum período de BMS é informado', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    const resultado = criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, periodosBms: [] },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toBe(
      'Cadastre ao menos um período de BMS para criar a obra.',
    );
  });

  it('CT-021 cria obra e período no mesmo ato', () => {
    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    const criada = criaObraProtegida(
      e2,
      {
        ...DADOS_DA_OBRA,
        periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
      },
      cenario.amb,
    );

    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const lista = listaPeriodosBms(criada.valor, paraObra(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('CT-022 recusa 31/09/2026, que não existe no calendário', () => {
    const resultado = cadastra(9, '2026-09-01', '2026-09-31');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-023 o primeiro dia do intervalo já é do período', () => {
    expect(cadastra(7, '2026-09-01', '2026-09-30').ok).toBe(true);

    const bms = resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-09-01'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(7);
  });

  it('CT-024 o último dia do intervalo ainda é do período', () => {
    expect(cadastra(6, '2026-08-01', '2026-08-31').ok).toBe(true);

    const bms = resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-08-31'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(6);
  });

  it('CT-025 na virada entre dois períodos vizinhos, o dia é do que começa', () => {
    expect(cadastra(6, '2026-08-01', '2026-08-31').ok).toBe(true);
    expect(cadastra(7, '2026-09-01', '2026-09-30').ok).toBe(true);

    const bms = resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-09-01'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(7);
  });

  it('CT-026 data não coberta por período nenhum devolve vazio, e não erro', () => {
    // Decisão 21.1: campo `BM'S` vazio, aviso na tela, RDO gerado. Número
    // inventado é o que a planilha faz, e é o que não se herda.
    const bms = resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-08-15'),
      cenario.amb,
    );

    expect(bms.ok).toBe(true);
    expect(bms.ok && bms.valor).toBeNull();
  });

  it('recusa dois períodos da mesma obra que se sobrepõem', () => {
    // Arquitetura, decisão 11 e pergunta P5: o `BM'S` amarra a fatura e não
    // pode ter duas respostas para o mesmo dia.
    expect(cadastra(6, '2026-08-01', '2026-08-31').ok).toBe(true);
    const resultado = cadastra(7, '2026-08-20', '2026-09-30');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toContain('se sobrepõe ao período de BMS 6');
  });

  it('recusa número de BMS repetido na mesma obra', () => {
    expect(cadastra(7, '2026-09-01', '2026-09-30').ok).toBe(true);
    const resultado = cadastra(7, '2026-10-01', '2026-10-31');

    expect(resultado.ok).toBe(false);
  });
});
