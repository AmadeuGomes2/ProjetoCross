/**
 * A trilha de exportação contra o ESQUEMA FÍSICO (R20).
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - CLAUDE.md, Segurança: "Exportação é ato registrado: quem, quando, qual
 *   obra, qual período";
 * - `docs/arquitetura/v1.md`, 2.22 e o esquema de `registro_exportacao`:
 *   exportação de período grava **uma linha por dia**, amarradas por `lote_id`,
 *   porque um par `data_inicial`/`data_final` transformaria o conjunto
 *   {02, 05, 09} em "02 a 09" e a auditoria leria oito dias onde houve três;
 * - `periodo/portas.ts`, `registraExportacao`: "Grava o lote **inteiro**, de uma
 *   vez. A trilha de um período é atômica: um lote pela metade afirmaria que só
 *   parte dos dias saiu."
 *
 * Por que existe agora: a transação era síncrona no `better-sqlite3` e passou a
 * ser assíncrona no Postgres. Atomicidade que ninguém verifica é promessa.
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { criaBancoDeTeste } from '../../../test/fixtures/banco-de-teste';
import type { ConexaoRdo } from '../../db';
import { obra, registroExportacao, usuario } from '../../db/schema';
import { criaDiaPuro, type DiaPuro } from '../../shared/date/dia';
import { geraId, idConfiavel } from '../../shared/id';
import type { EventoDeExportacaoDePeriodo, LoteDeExportacaoId } from './periodo/portas';
import { registraExportacaoDePeriodoNoBanco } from './repositorio';

/** PGlite é o Postgres inteiro em WebAssembly: subir um banco leva segundos. */
const TEMPO_DO_BANCO = 60_000;

const E1 = idConfiavel<'usuario'>('11111111-1111-4111-8111-111111111112');
const OBRA = idConfiavel<'obra'>('22222222-2222-4222-8222-222222222222');
const OBRA_INEXISTENTE = idConfiavel<'obra'>('99999999-9999-4999-8999-999999999999');
const INSTANTE = '2026-09-16T12:00:00.000Z';

let conexao: ConexaoRdo;

function dia(bruto: string): DiaPuro {
  const r = criaDiaPuro(bruto);
  if (!r.ok) throw new Error(`Literal de teste invalido: ${bruto}`);
  return r.valor;
}

function evento(
  data: string,
  loteId: LoteDeExportacaoId,
  obraId = OBRA,
): EventoDeExportacaoDePeriodo {
  return {
    obraId,
    usuarioId: E1,
    momento: INSTANTE,
    dia: dia(data),
    formato: 'PDF',
    loteId,
  };
}

beforeEach(async () => {
  conexao = await criaBancoDeTeste();
  await conexao.db.insert(usuario).values({
    id: E1,
    nome: 'Engenheiro de Teste',
    email: 'e1@exemplo.invalido',
    criadoEm: INSTANTE,
  });
  await conexao.db.insert(obra).values({
    id: OBRA,
    contrato: 'C-001/TESTE',
    contratante: 'CONTRATANTE DE TESTE',
    contratada: 'CONTRATADA DE TESTE',
    dataInicio: dia('2026-02-05'),
    dataTermino: dia('2027-02-05'),
    escopo: 'ESCOPO',
    nomeProjeto: 'PROJETO',
    area: 'AREA',
    local: 'LOCAL',
    criadoPor: E1,
    criadoEm: INSTANTE,
  });
}, TEMPO_DO_BANCO);

afterEach(async () => {
  await conexao.fecha();
}, TEMPO_DO_BANCO);

describe('trilha de exportação de período', () => {
  it('grava uma linha por dia do conjunto, com o mesmo lote', async () => {
    const lote = geraId<'lote_de_exportacao'>();

    const r = await registraExportacaoDePeriodoNoBanco(conexao.db, [
      evento('2026-09-02', lote),
      evento('2026-09-05', lote),
      evento('2026-09-09', lote),
    ]);

    expect(r.ok).toBe(true);
    const linhas = await conexao.db
      .select({ dataRdo: registroExportacao.dataRdo, loteId: registroExportacao.loteId })
      .from(registroExportacao);
    // O conjunto não contíguo continua sendo três dias, não oito.
    expect(linhas).toHaveLength(3);
    expect(linhas.map((l) => l.dataRdo).sort()).toEqual([
      '2026-09-02',
      '2026-09-05',
      '2026-09-09',
    ]);
    expect(new Set(linhas.map((l) => l.loteId))).toEqual(new Set([lote]));
  });

  /**
   * A recusa vem do banco, no meio do lote: a segunda linha aponta para uma
   * obra que não existe e viola a chave estrangeira. Um lote pela metade diria
   * ao auditor que só parte dos dias saiu — e os arquivos saíram todos.
   */
  it('a recusa no meio do lote não deixa trilha pela metade', async () => {
    const lote = geraId<'lote_de_exportacao'>();

    const r = await registraExportacaoDePeriodoNoBanco(conexao.db, [
      evento('2026-09-02', lote),
      evento('2026-09-05', lote, OBRA_INEXISTENTE),
      evento('2026-09-09', lote),
    ]);

    expect(r.ok).toBe(false);
    expect(await conexao.db.select().from(registroExportacao)).toHaveLength(0);
  });

  it('conjunto vazio não grava nada e não é erro', async () => {
    const r = await registraExportacaoDePeriodoNoBanco(conexao.db, []);

    expect(r.ok).toBe(true);
    expect(await conexao.db.select().from(registroExportacao)).toHaveLength(0);
  });
});
