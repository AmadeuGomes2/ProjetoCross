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
 * lugar de `≤` passa despercebido. Elas importam mais desde 17/09/2026, com o
 * Postgres: `data_inicial` e `data_final` viraram `DATE`, e a comparação de
 * intervalo deixou de ser de texto para ser de calendário.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';
import {
  cadastraPeriodoBmsProtegido,
  criaObraProtegida,
  listaPeriodosBmsProtegida,
  resolveBmsDoDiaProtegido,
} from '../../app/_composicao/cadastro';
import { acesso } from '../../db/schema';
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
import { geraId, type ObraId, type UsuarioId } from '../../shared/id';

const AGORA = '2026-09-16T12:00:00.000Z';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(async () => {
  cenario = await montaCenario();
  e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = await criaObraDoPrd(e1, cenario.amb, {
    // A obra nasce com o período 1; os testes cadastram os demais.
    periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
  });
});

afterEach(async () => {
  await cenario.fecha();
});

function cadastra(numero: number, dataInicial: string, dataFinal: string) {
  return cadastraPeriodoBmsProtegido(
    e1,
    obraId,
    { numero, dataInicial, dataFinal },
    cenario.amb,
  );
}

/** Acesso de encarregado gravado direto na tabela, sem passar pelo módulo. */
async function liberaEncarregado(usuarioId: UsuarioId): Promise<void> {
  await cenario.conexao.db.insert(acesso).values({
    id: geraId<'acesso'>(),
    obraId,
    usuarioId,
    perfil: 'encarregado',
    liberadoPor: e1.usuarioId,
    liberadoEm: AGORA,
  });
}

describe('F1.2 — períodos de BMS', () => {
  it('CT-015 cadastra o período 7 de 01/09 a 30/09/2026, com duração de 30 dias', async () => {
    expect((await cadastra(7, '2026-09-01', '2026-09-30')).ok).toBe(true);

    const lista = await listaPeriodosBmsProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    const periodo = lista.valor.find((p) => p.numero === 7);
    expect(periodo?.dataInicial).toBe('2026-09-01');
    expect(periodo?.dataFinal).toBe('2026-09-30');
    // `final − inicial + 1`. Sem o `+ 1` daria 29, que é o erro clássico.
    expect(periodo?.dias).toBe(30);
  });

  it('CT-016 aceita período de um dia e conta 1 dia, não 0', async () => {
    expect((await cadastra(2, '2026-03-02', '2026-03-02')).ok).toBe(true);

    const lista = await listaPeriodosBms(obraId, paraObra(cenario.amb));
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;
    expect(lista.valor.find((p) => p.numero === 2)?.dias).toBe(1);
  });

  it('CT-017 recusa fim anterior ao início e diz o que corrigir', async () => {
    const resultado = await cadastra(2, '2026-02-28', '2024-03-12');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
    expect(resultado.erro.mensagem).toBe('A data final não pode ser anterior à inicial.');
  });

  it('CT-018 recusa o intervalo real de -716 dias de DADOS!E6', async () => {
    expect((await cadastra(3, '2024-12-01', '2022-12-15')).ok).toBe(false);
  });

  it('CT-019 recusa no servidor o período enviado por um encarregado', async () => {
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await liberaEncarregado(c1.usuarioId);

    const resultado = await cadastraPeriodoBmsProtegido(
      c1,
      obraId,
      { numero: 8, dataInicial: '2026-10-01', dataFinal: '2026-10-31' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    const depois = await listaPeriodosBms(obraId, paraObra(cenario.amb));
    expect(depois.ok && depois.valor.some((p) => p.numero === 8)).toBe(false);
  });

  it('CT-020 não cria a obra quando nenhum período de BMS é informado', async () => {
    // E1 já é engenheiro da obra do `beforeEach`, e por isso pode criar outra
    // (25.1): a recusa aqui é pela falta de período, e não pela permissão.
    const resultado = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, periodosBms: [] },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toBe(
      'Cadastre ao menos um período de BMS para criar a obra.',
    );
  });

  it('CT-021 cria obra e período no mesmo ato', async () => {
    const criada = await criaObraProtegida(
      e1,
      {
        ...DADOS_DA_OBRA,
        periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
      },
      cenario.amb,
    );

    expect(criada.ok).toBe(true);
    if (!criada.ok) return;

    const lista = await listaPeriodosBms(criada.valor, paraObra(cenario.amb));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('CT-022 recusa 31/09/2026, que não existe no calendário', async () => {
    const resultado = await cadastra(9, '2026-09-01', '2026-09-31');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-023 o primeiro dia do intervalo já é do período', async () => {
    expect((await cadastra(7, '2026-09-01', '2026-09-30')).ok).toBe(true);

    const bms = await resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-09-01'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(7);
  });

  it('CT-024 o último dia do intervalo ainda é do período', async () => {
    expect((await cadastra(6, '2026-08-01', '2026-08-31')).ok).toBe(true);

    const bms = await resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-08-31'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(6);
  });

  it('CT-025 na virada entre dois períodos vizinhos, o dia é do que começa', async () => {
    expect((await cadastra(6, '2026-08-01', '2026-08-31')).ok).toBe(true);
    expect((await cadastra(7, '2026-09-01', '2026-09-30')).ok).toBe(true);

    const bms = await resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-09-01'),
      cenario.amb,
    );
    expect(bms.ok && bms.valor).toBe(7);
  });

  it('CT-026 data não coberta por período nenhum devolve vazio, e não erro', async () => {
    // Decisão 21.1: campo `BM'S` vazio, aviso na tela, RDO gerado. Número
    // inventado é o que a planilha faz, e é o que não se herda.
    const bms = await resolveBmsDoDiaProtegido(
      e1,
      obraId,
      diaPuroConfiavel('2026-08-15'),
      cenario.amb,
    );

    expect(bms.ok).toBe(true);
    expect(bms.ok && bms.valor).toBeNull();
  });

  it('recusa dois períodos da mesma obra que se sobrepõem', async () => {
    // Arquitetura, decisão 11 e pergunta P5: o `BM'S` amarra a fatura e não
    // pode ter duas respostas para o mesmo dia.
    expect((await cadastra(6, '2026-08-01', '2026-08-31')).ok).toBe(true);
    const resultado = await cadastra(7, '2026-08-20', '2026-09-30');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toContain('se sobrepõe ao período de BMS 6');
    // Origem: `src/shared/result`, CODIGO_ERRO.INTERVALO_SOBREPOSTO. O código
    // gravado no log tem de dizer a mesma coisa que a mensagem exibida; aqui
    // não há nenhum intervalo com a ordem das datas invertida.
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.INTERVALO_SOBREPOSTO);
  });

  it('recusa dois períodos que compartilham exatamente um dia', async () => {
    // Fronteira da sobreposição: um dia em comum já é "duas respostas para o
    // mesmo dia", que é o que a decisão 11 da arquitetura proíbe. O vizinho que
    // começa no dia seguinte é aceito, e isso é o CT-025.
    expect((await cadastra(6, '2026-08-01', '2026-08-31')).ok).toBe(true);

    const resultado = await cadastra(7, '2026-08-31', '2026-09-30');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.INTERVALO_SOBREPOSTO);
  });

  it('recusa número de BMS repetido na mesma obra', async () => {
    expect((await cadastra(7, '2026-09-01', '2026-09-30')).ok).toBe(true);
    const resultado = await cadastra(7, '2026-10-01', '2026-10-31');

    expect(resultado.ok).toBe(false);
  });
});
