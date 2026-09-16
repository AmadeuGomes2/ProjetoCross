/**
 * Teste de integração do módulo contra o ESQUEMA FÍSICO.
 *
 * Os testes de caso de uso rodam contra a dupla em memória, que é rápida e não
 * toca disco. Este arquivo existe para a outra pergunta: o que o módulo escreve
 * passa pelos CHECK e pelas chaves estrangeiras do banco de verdade?
 *
 * Banco em memória, migrations aplicadas, e as linhas de apoio — usuário, obra,
 * serviço, status — inseridas com SQL cru, porque essas tabelas são de outra
 * frente e este módulo não as escreve.
 *
 * Expectativas: as mesmas dos casos CT-086 a CT-160; nenhuma lida da
 * implementação.
 */

import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { criaBanco, type ConexaoRdo } from '../../db';
import { criaDiaPuro, type DiaPuro } from '../../shared/date/dia';
import { idConfiavel } from '../../shared/id';
import { CODIGO_ERRO, erro, erroDeAcesso, ok } from '../../shared/result';
import { chaveDeTermo } from '../../shared/taxonomia';
import { deTextoDoUsuario } from '../../shared/decimal';
import { criaCasosDeLancamento } from './index';
import type { PortasDoLancamento } from './portas';
import { criaRepositorioDrizzle } from './repositorio-drizzle';

const PASTA_DE_MIGRATIONS = fileURLToPath(
  new URL('../../db/migrations', import.meta.url),
);

const C1 = idConfiavel<'usuario'>('11111111-1111-4111-8111-111111111111');
const E1 = idConfiavel<'usuario'>('11111111-1111-4111-8111-111111111112');
const OBRA = idConfiavel<'obra'>('22222222-2222-4222-8222-222222222222');
const SERVICO = idConfiavel<'servico_controlado'>('33333333-3333-4333-8333-333333333333');
const STATUS = idConfiavel<'status_atividade'>('44444444-4444-4444-8444-444444444444');
const INSTANTE = '2026-09-16T12:00:00.000Z';

let conexao: ConexaoRdo;

function dia(bruto: string): DiaPuro {
  const r = criaDiaPuro(bruto);
  if (!r.ok) throw new Error(`Literal de teste invalido: ${bruto}`);
  return r.valor;
}

function quantidade(bruto: string) {
  const r = deTextoDoUsuario(bruto);
  if (!r.ok) throw new Error(`Literal de teste invalido: ${bruto}`);
  return r.valor;
}

function montaBase(): void {
  const s = conexao.sqlite;
  const inserePessoa = s.prepare(
    `INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)`,
  );
  inserePessoa.run(C1, 'Encarregado de Teste', 'c1@exemplo.invalido', INSTANTE);
  inserePessoa.run(E1, 'Engenheiro de Teste', 'e1@exemplo.invalido', INSTANTE);
  s.prepare(
    `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                       escopo, nome_projeto, area, "local", criado_por, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    OBRA,
    'C-001/TESTE',
    'CONTRATANTE DE TESTE',
    'CONTRATADA DE TESTE',
    '2026-02-05',
    '2027-02-05',
    'ESCOPO',
    'PROJETO',
    'AREA',
    'LOCAL',
    E1,
    INSTANTE,
  );
  s.prepare(
    `INSERT INTO servico_controlado (id, obra_id, nome, nome_normalizado, ordem, ativo)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(SERVICO, OBRA, 'REC.(FRESA+CAPA)', 'rec.(fresa+capa)', 1);
  s.prepare(
    `INSERT INTO status_atividade (id, termo, termo_normalizado, ordem, ativo, criado_em)
     VALUES (?, ?, ?, ?, 1, ?)`,
  ).run(STATUS, 'Produção', chaveDeTermo('Produção'), 1, INSTANTE);
}

/** Portas da frente A, no mínimo que o contrato exige. */
const portas: PortasDoLancamento = {
  exigeAcessoNaObra: (ator, obraId) => {
    if (obraId !== OBRA) {
      return Promise.resolve(
        erro(
          erroDeAcesso(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada ou sem acesso.'),
        ),
      );
    }
    return Promise.resolve(
      ok({
        usuarioId: ator.usuarioId,
        obraId: OBRA,
        perfil: ator.usuarioId === E1 ? 'engenheiro' : 'encarregado',
      }),
    );
  },
  periodoDaObra: () =>
    Promise.resolve({ dataInicio: dia('2026-02-05'), dataTermino: dia('2027-02-05') }),
  status: {
    porId: (id) =>
      Promise.resolve(id === STATUS ? { id: STATUS, termo: 'Produção' } : null),
    porTermo: (termo) =>
      Promise.resolve(
        chaveDeTermo(termo) === chaveDeTermo('Produção')
          ? { id: STATUS, termo: 'Produção' }
          : null,
      ),
    ativos: () => Promise.resolve([{ id: STATUS, termo: 'Produção' }]),
  },
  servicos: {
    porId: (_obraId, id) =>
      Promise.resolve(
        id === SERVICO
          ? {
              id: SERVICO,
              obraId: OBRA,
              nome: 'REC.(FRESA+CAPA)',
              quantidadeProjeto: quantidade('2210,392'),
            }
          : null,
      ),
    porNome: (_obraId, nome) =>
      Promise.resolve(
        chaveDeTermo(nome) === chaveDeTermo('REC.(FRESA+CAPA)')
          ? {
              id: SERVICO,
              obraId: OBRA,
              nome: 'REC.(FRESA+CAPA)',
              quantidadeProjeto: quantidade('2210,392'),
            }
          : null,
      ),
    daObra: () =>
      Promise.resolve([
        {
          id: SERVICO,
          obraId: OBRA,
          nome: 'REC.(FRESA+CAPA)',
          quantidadeProjeto: quantidade('2210,392'),
        },
      ]),
  },
  sugestoesDeMotivo: () => Promise.resolve(['Domingo']),
};

let instante = Date.parse(INSTANTE);
function relogio(): Date {
  instante += 1000;
  return new Date(instante);
}

function casosDoBanco() {
  return criaCasosDeLancamento({
    repositorio: criaRepositorioDrizzle(conexao),
    portas,
    relogio,
  });
}

beforeEach(() => {
  conexao = criaBanco(':memory:');
  migrate(conexao.db, { migrationsFolder: PASTA_DE_MIGRATIONS });
  montaBase();
  instante = Date.parse(INSTANTE);
});

afterEach(() => {
  conexao.fecha();
});

describe('módulo lancamento contra o esquema físico', () => {
  it('o primeiro lançamento do dia cria a linha de dia_de_obra e a atividade', async () => {
    const casos = casosDoBanco();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: STATUS },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaGravado = conexao.sqlite
      .prepare(`SELECT estado, motivo_parada FROM dia_de_obra WHERE obra_id = ?`)
      .get(OBRA);
    expect(diaGravado).toEqual({ estado: 'trabalhado', motivo_parada: null });
    const lista = await casos.listaAtividadesVigentes(OBRA, dia('2026-09-03'));
    expect(lista.ok && lista.valor[0]?.descricao).toBe('Fresagem da Rua A');
    expect(lista.ok && lista.valor[0]?.statusTermo).toBe('Produção');
  });

  it('a quantidade com três casas volta do banco exatamente igual', async () => {
    const casos = casosDoBanco();
    await casos.recebeProducao(
      {
        obraId: OBRA,
        data: '2026-09-03',
        servico: { tipo: 'id', id: SERVICO },
        quantidade: '2210,392',
      },
      { usuarioId: C1 },
    );

    const acumulado = await casos.somaProducaoAte(OBRA, dia('2026-09-03'));

    expect(acumulado.ok && acumulado.valor[0]?.quantidade.toString()).toBe('2210.392');
    const bruto = conexao.sqlite
      .prepare(`SELECT quantidade_milesimos AS q FROM lancamento_producao`)
      .get();
    // O banco guarda INTEGER em milésimos: nenhuma coluna REAL no esquema.
    expect(bruto).toEqual({ q: 2210392 });
  });

  it('o dia parado grava o motivo e recusa atividade, sem mudar de estado', async () => {
    const casos = casosDoBanco();
    await casos.declaraEstadoDoDia(
      {
        obraId: OBRA,
        data: dia('2026-09-06'),
        estado: 'parado',
        motivoParada: 'Domingo',
      },
      { usuarioId: C1 },
    );

    const recusada = await casos.lancaAtividade(
      {
        obraId: OBRA,
        data: dia('2026-09-06'),
        descricao: 'Limpeza do pátio',
        status: { tipo: 'id', id: STATUS },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(recusada.ok).toBe(false);
    const gravado = conexao.sqlite
      .prepare(`SELECT estado, motivo_parada FROM dia_de_obra WHERE data = '2026-09-06'`)
      .get();
    expect(gravado).toEqual({ estado: 'parado', motivo_parada: 'Domingo' });
    expect(
      conexao.sqlite.prepare(`SELECT count(*) AS n FROM lancamento_atividade`).get(),
    ).toEqual({ n: 0 });
  });

  it('fechar o dia grava quem fechou, quando e o número congelado', async () => {
    const casos = casosDoBanco();
    await casos.lancaAtividade(
      {
        obraId: OBRA,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: STATUS },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const r = await casos.fechaDia(
      { obraId: OBRA, data: dia('2026-09-03') },
      { usuarioId: E1 },
    );

    expect(r.ok && r.valor).toBe(210);
    const gravado = conexao.sqlite
      .prepare(
        `SELECT fechado_por, numero_rdo_congelado AS numero FROM dia_de_obra WHERE data = '2026-09-03'`,
      )
      .get();
    expect(gravado).toEqual({ fechado_por: E1, numero: 210 });
  });

  it('a retificação grava a segunda linha apontando para o original', async () => {
    const casos = casosDoBanco();
    const original = await casos.lancaAtividade(
      {
        obraId: OBRA,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: STATUS },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    if (!original.ok) throw new Error('Preparação do teste falhou');
    await casos.fechaDia({ obraId: OBRA, data: dia('2026-09-03') }, { usuarioId: E1 });

    const r = await casos.retificaLancamento(
      {
        obraId: OBRA,
        lancamentoId: original.valor.id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: STATUS },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    expect(
      conexao.sqlite.prepare(`SELECT count(*) AS n FROM lancamento_atividade`).get(),
    ).toEqual({ n: 2 });
    const vigentes = await casos.listaAtividadesVigentes(OBRA, dia('2026-09-03'));
    expect(vigentes.ok && vigentes.valor).toHaveLength(1);
    expect(vigentes.ok && vigentes.valor[0]?.descricao).toBe(
      'Fresagem da Rua A, estacas 10 a 14',
    );
  });

  it('turno em branco vira NULL no banco e o índice zero é aceito', async () => {
    const casos = casosDoBanco();

    const r = await casos.recebePluviometria(
      {
        obraId: OBRA,
        data: '2026-09-03',
        noiteAnterior: 'B',
        manha: 'B',
        tarde: '',
        indiceMm: '0',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(
      conexao.sqlite
        .prepare(
          `SELECT tarde, indice_mm_milesimos AS indice FROM lancamento_pluviometria`,
        )
        .get(),
    ).toEqual({ tarde: null, indice: 0 });
  });

  it('o acumulado é recalculado do banco, somando os dias anteriores', async () => {
    const casos = casosDoBanco();
    for (const [data, valor] of [
      ['2026-09-01', '10,001'],
      ['2026-09-02', '0,002'],
      ['2026-09-03', '0,003'],
      ['2026-09-04', '99'],
    ] as const) {
      await casos.recebeProducao(
        {
          obraId: OBRA,
          data,
          servico: { tipo: 'id', id: SERVICO },
          quantidade: valor,
        },
        { usuarioId: C1 },
      );
    }

    const acumulado = await casos.somaProducaoAte(OBRA, dia('2026-09-03'));

    expect(acumulado.ok && acumulado.valor[0]?.quantidade.toString()).toBe('10.006');
  });
});
