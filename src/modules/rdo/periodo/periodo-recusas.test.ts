/**
 * O que o consolidado recusa.
 *
 * Origem das expectativas:
 *
 * - decisão 23.1 (`regras-rdo` §5): consultar o RDO de um dia **fora do período
 *   da obra** não gera documento. Sem isso o número do RDO sairia negativo;
 * - `periodo.md`, 1.4: num conjunto, um dia fora do contrato recusa o pedido
 *   **inteiro**. Filtrar produziria um consolidado com faixa de RDO e total de
 *   mm calculados sobre menos dias do que a pessoa escolheu, sem ela saber;
 * - a mensagem nomeia até **três** datas e diz quantas são no total: mensagem é
 *   para quem vai agir, e uma lista de 300 datas não é acionável;
 * - `CLAUDE.md`, Segurança: mensagem de erro não carrega nome de pessoa nem
 *   rastro de pilha.
 *
 * O contrato da obra sintética vai de 05/02/2026 a 05/02/2027.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../../shared/result';
import { OBRA } from '../teste/duplas';
import { montaRdoDePeriodo } from './monta-rdo-de-periodo';
import { criaPortasDePeriodoFalsas, dia } from './teste/duplas-de-periodo';

async function monta(dias: readonly string[]) {
  return montaRdoDePeriodo(OBRA, dias.map(dia), criaPortasDePeriodoFalsas());
}

describe('recusas do RDO de período', () => {
  it('recusa o conjunto inteiro quando um só dia está fora do contrato', async () => {
    const r = await monta(['2026-09-01', '2026-09-02', '2026-02-04']);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA);
  });

  it('diz na mensagem quantos dias estão fora e nomeia no máximo três', async () => {
    const r = await monta([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-09-01',
    ]);

    expect(!r.ok && r.erro.mensagem).toBe(
      'O conjunto tem 4 dias fora do período do contrato, que vai de 05/02/2026 a 05/02/2027: 01/01/2026, 02/01/2026, 03/01/2026 e outros.',
    );
  });

  it('recusa o conjunto vazio em vez de montar um documento sem dia nenhum', async () => {
    const r = await monta([]);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.CAMPO_OBRIGATORIO);
  });

  it('aceita o primeiro e o último dia do contrato, que são dias de RDO', async () => {
    const r = await monta(['2026-02-05', '2027-02-05']);

    expect(r.ok).toBe(true);
  });
});
