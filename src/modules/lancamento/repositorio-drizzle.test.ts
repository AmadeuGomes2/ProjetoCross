/**
 * Teste de integração do módulo contra o ESQUEMA FÍSICO.
 *
 * Os testes de caso de uso rodam contra a dupla em memória, que é rápida e não
 * toca disco. Este arquivo existe para a outra pergunta: o que o módulo escreve
 * passa pelos CHECK e pelas chaves estrangeiras do banco de verdade?
 *
 * Desde 17/09/2026 o banco é Postgres, e aqui ele é **PGlite**, o mesmo
 * Postgres compilado para WebAssembly que `test/fixtures/banco-de-teste.ts`
 * monta: mesmo dialeto, mesmas migrations, mesmas restrições da produção.
 *
 * As linhas de apoio — usuário, obra, serviço, status — são inseridas direto
 * nas tabelas, sem passar pelos módulos que as possuem: um defeito na frente
 * vizinha não pode derrubar a montagem deste arquivo.
 *
 * Expectativas: as mesmas dos casos CT-086 a CT-160; nenhuma lida da
 * implementação.
 */

import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criaBancoDeTeste } from '../../../test/fixtures/banco-de-teste';
import type { BancoRdo, ConexaoRdo } from '../../db';
import {
  diaDeObra,
  lancamentoAtividade,
  lancamentoPluviometria,
  lancamentoProducao,
  obra,
  servicoControlado,
  statusAtividade,
  usuario,
} from '../../db/schema';
import { criaDiaPuro, type DiaPuro } from '../../shared/date/dia';
import { geraId, idConfiavel, type StatusAtividadeId } from '../../shared/id';
import { CODIGO_ERRO, erro, erroDeAcesso, ok } from '../../shared/result';
import { chaveDeTermo } from '../../shared/taxonomia';
import { deTextoDoUsuario } from '../../shared/decimal';
import { criaCasosDeLancamento } from './index';
import type { PortasDoLancamento } from './portas';
import { criaRepositorioDrizzle } from './repositorio-drizzle';
import type { DiaDeObra, LinhaDeAtividade } from './tipos';

const C1 = idConfiavel<'usuario'>('11111111-1111-4111-8111-111111111111');
const E1 = idConfiavel<'usuario'>('11111111-1111-4111-8111-111111111112');
const OBRA = idConfiavel<'obra'>('22222222-2222-4222-8222-222222222222');
const SERVICO = idConfiavel<'servico_controlado'>('33333333-3333-4333-8333-333333333333');
const INSTANTE = '2026-09-16T12:00:00.000Z';

/**
 * PGlite é o Postgres inteiro em WebAssembly: subir um banco novo custa alguns
 * segundos, bem acima do limite padrão do vitest. O tempo é do banco, não do
 * que se está medindo, e por isso é dito aqui em vez de afrouxar o arquivo.
 */
const TEMPO_DO_BANCO = 60_000;

let conexao: ConexaoRdo;
/**
 * O id do status `Produção`.
 *
 * Não é constante: `criaBancoDeTeste()` semeia as taxonomias, e
 * `status_atividade` tem `UNIQUE (termo_normalizado)` — inserir um `Produção`
 * de id fixo colidiria com o semeado. O teste insere se faltar e depois **lê**
 * o id que valeu, que é o que o banco de produção também terá.
 */
let STATUS: StatusAtividadeId;

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

async function montaBase(): Promise<void> {
  const db = conexao.db;
  await db.insert(usuario).values([
    {
      id: C1,
      nome: 'Encarregado de Teste',
      email: 'c1@exemplo.invalido',
      criadoEm: INSTANTE,
    },
    {
      id: E1,
      nome: 'Engenheiro de Teste',
      email: 'e1@exemplo.invalido',
      criadoEm: INSTANTE,
    },
  ]);
  await db.insert(obra).values({
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
  await db.insert(servicoControlado).values({
    id: SERVICO,
    obraId: OBRA,
    nome: 'REC.(FRESA+CAPA)',
    nomeNormalizado: 'rec.(fresa+capa)',
    ordem: 1,
    ativo: 1,
  });
  await db
    .insert(statusAtividade)
    .values({
      id: idConfiavel<'status_atividade'>('44444444-4444-4444-8444-444444444444'),
      termo: 'Produção',
      termoNormalizado: chaveDeTermo('Produção'),
      ordem: 1,
      ativo: 1,
      criadoEm: INSTANTE,
    })
    .onConflictDoNothing();
  const achado = await db
    .select()
    .from(statusAtividade)
    .where(eq(statusAtividade.termoNormalizado, chaveDeTermo('Produção')))
    .limit(1);
  const linha = achado[0];
  if (linha === undefined) throw new Error('Montagem do cenário: status não gravado');
  STATUS = linha.id;
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

/** Um `dia_de_obra` trabalhado, pronto para gravar. */
function diaTrabalhado(data: string): DiaDeObra {
  return {
    obraId: OBRA,
    data: dia(data),
    estado: 'trabalhado',
    motivoParada: null,
    registradoPor: C1,
    registradoEm: INSTANTE,
    atualizadoPor: null,
    atualizadoEm: null,
    fechadoPor: null,
    fechadoEm: null,
    numeroRdoCongelado: null,
  };
}

/** Uma atividade original, fora de cadeia e sem exclusão. */
function atividade(data: string): LinhaDeAtividade {
  const id = geraId<'lancamento'>();
  return {
    id,
    obraId: OBRA,
    data: dia(data),
    autorId: C1,
    registradoEm: INSTANTE,
    atualizadoPor: null,
    atualizadoEm: null,
    raizId: id,
    retificaId: null,
    chaveDeRascunho: null,
    exclusao: null,
    tipo: 'atividade',
    descricao: `Fresagem da Rua A em ${data}`,
    statusId: STATUS,
  };
}

function casosDoBanco() {
  return criaCasosDeLancamento({
    repositorio: criaRepositorioDrizzle(conexao),
    portas,
    relogio,
  });
}

beforeEach(async () => {
  conexao = await criaBancoDeTeste();
  await montaBase();
  instante = Date.parse(INSTANTE);
}, TEMPO_DO_BANCO);

afterEach(async () => {
  vi.restoreAllMocks();
  await conexao.fecha();
}, TEMPO_DO_BANCO);

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
    const diaGravado = await conexao.db
      .select({ estado: diaDeObra.estado, motivoParada: diaDeObra.motivoParada })
      .from(diaDeObra)
      .where(eq(diaDeObra.obraId, OBRA));
    expect(diaGravado).toEqual([{ estado: 'trabalhado', motivoParada: null }]);
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
    const bruto = await conexao.db
      .select({ q: lancamentoProducao.quantidadeMilesimos })
      .from(lancamentoProducao);
    // O banco guarda INTEGER em milésimos: nenhuma coluna de ponto flutuante.
    expect(bruto).toEqual([{ q: 2210392 }]);
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
    const gravado = await conexao.db
      .select({ estado: diaDeObra.estado, motivoParada: diaDeObra.motivoParada })
      .from(diaDeObra)
      .where(eq(diaDeObra.data, dia('2026-09-06')));
    expect(gravado).toEqual([{ estado: 'parado', motivoParada: 'Domingo' }]);
    expect(await conexao.db.select().from(lancamentoAtividade)).toHaveLength(0);
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
    const gravado = await conexao.db
      .select({
        fechadoPor: diaDeObra.fechadoPor,
        numero: diaDeObra.numeroRdoCongelado,
      })
      .from(diaDeObra)
      .where(eq(diaDeObra.data, dia('2026-09-03')));
    expect(gravado).toEqual([{ fechadoPor: E1, numero: 210 }]);
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
    expect(await conexao.db.select().from(lancamentoAtividade)).toHaveLength(2);
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
      await conexao.db
        .select({
          tarde: lancamentoPluviometria.tarde,
          indice: lancamentoPluviometria.indiceMmMilesimos,
        })
        .from(lancamentoPluviometria),
    ).toEqual([{ tarde: null, indice: 0 }]);
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

  /**
   * Decisão 30.1, contra o esquema físico. Os casos de uso já provam a regra
   * contra a dupla em memória; o que se pergunta aqui é outra coisa: o
   * `UPDATE` de exclusão passa pelos CHECK do banco, e o que volta da leitura
   * é o objeto `exclusao` montado das três colunas?
   */
  it('excluir marca as três colunas e não apaga a linha do banco', async () => {
    const casos = casosDoBanco();
    const lancada = await casos.lancaAtividade(
      {
        obraId: OBRA,
        data: dia('2026-09-03'),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: STATUS },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    if (!lancada.ok) throw new Error('Preparação do teste falhou');

    const r = await casos.excluiLancamento(
      {
        obraId: OBRA,
        lancamentoId: lancada.valor.id,
        tipo: 'atividade',
        motivo: 'Lançada na data errada',
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    expect(
      await conexao.db
        .select({
          excluidoPor: lancamentoAtividade.excluidoPor,
          motivoExclusao: lancamentoAtividade.motivoExclusao,
        })
        .from(lancamentoAtividade),
    ).toEqual([{ excluidoPor: E1, motivoExclusao: 'Lançada na data errada' }]);
    const lista = await casos.listaAtividadesVigentes(OBRA, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('excluída a pluviometria do dia, o dia aceita uma leitura nova', async () => {
    // O índice único de UMA cadeia por dia ignora a excluída: senão excluir a
    // leitura errada trancaria o bloco 9 do dia para sempre.
    const casos = casosDoBanco();
    const primeira = await casos.recebePluviometria(
      { obraId: OBRA, data: '2026-09-03', manha: 'C', indiceMm: '4' },
      { usuarioId: C1 },
    );
    if (!primeira.ok) throw new Error('Preparação do teste falhou');
    await casos.excluiLancamento(
      {
        obraId: OBRA,
        lancamentoId: primeira.valor.id,
        tipo: 'pluviometria',
        motivo: 'Leitura do pluviômetro de outro canteiro',
      },
      { usuarioId: E1 },
    );

    const segunda = await casos.recebePluviometria(
      { obraId: OBRA, data: '2026-09-03', manha: 'B', indiceMm: '0' },
      { usuarioId: C1 },
    );

    expect(segunda.ok).toBe(true);
    const vigente = await casos.obtemPluviometriaVigente(OBRA, dia('2026-09-03'));
    expect(vigente.ok && vigente.valor?.manha).toBe('B');
  });
});

/**
 * As quatro consultas que comparam data, contra o tipo `DATE` do Postgres.
 *
 * O dia puro era `TEXT` e virou `DATE` em 17/09/2026: a comparação deixou de
 * ser lexicográfica e passou a ser de data de verdade. Os contratos NÃO mudaram,
 * e é isso que se trava aqui.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `repositorio.ts`, `dosDias`: "Recebe conjunto, e não intervalo: `{02, 05,
 *   09}` não pode trazer o dia 03 (DP1)";
 * - `repositorio.ts`, `naJanela`: devolve **só o que existe** dentro do
 *   intervalo fechado; dia sem linha não vem, e quem monta o painel o marca
 *   como `nao_lancado` (decisão 4.2);
 * - `repositorio-drizzle.ts`, `conjuntoVazio`: conjunto vazio responde nada sem
 *   ir ao banco, porque `IN ()` não é SQL válido.
 */
describe('as consultas por data contra o tipo DATE', () => {
  async function semeiaDias(datas: readonly string[]): Promise<void> {
    const repositorio = criaRepositorioDrizzle(conexao);
    for (const data of datas) {
      await repositorio.dia.salva(diaTrabalhado(data));
      await repositorio.atividades.grava(atividade(data));
    }
  }

  it('o conjunto traz só os dias pedidos, nunca o intervalo entre eles', async () => {
    await semeiaDias(['2026-09-02', '2026-09-03', '2026-09-05', '2026-09-09']);
    const repositorio = criaRepositorioDrizzle(conexao);
    const pedidos = [dia('2026-09-02'), dia('2026-09-05'), dia('2026-09-09')];

    const dias = await repositorio.dia.nosDias(OBRA, pedidos);
    const atividades = await repositorio.atividades.dosDias(OBRA, pedidos);

    // O dia 03 existe no banco e NÃO foi pedido: somá-lo seria somar o RDO de
    // um dia que ninguém mandou exportar.
    expect(dias.map((d) => d.data)).toEqual(['2026-09-02', '2026-09-05', '2026-09-09']);
    expect(atividades.map((a) => a.data)).toEqual([
      '2026-09-02',
      '2026-09-05',
      '2026-09-09',
    ]);
  });

  it('o conjunto vazio devolve nada, sem consultar o banco', async () => {
    await semeiaDias(['2026-09-02']);
    const repositorio = criaRepositorioDrizzle(conexao);
    // Arma o banco: `IN ()` não é SQL válido, e a resposta é conhecida sem ele.
    vi.spyOn(conexao.db, 'select').mockImplementation(() => {
      throw new Error('Conjunto vazio não devia ter ido ao banco.');
    });

    expect(await repositorio.dia.nosDias(OBRA, [])).toEqual([]);
    expect(await repositorio.atividades.dosDias(OBRA, [])).toEqual([]);
    expect(await repositorio.producao.dosDias(OBRA, [])).toEqual([]);
    expect(await repositorio.pluviometria.dosDias(OBRA, [])).toEqual([]);
    expect(await repositorio.observacoes.dosDias(OBRA, [])).toEqual([]);
  });

  it('a janela é fechada nas duas pontas e exclui o dia de fora', async () => {
    await semeiaDias(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
    const repositorio = criaRepositorioDrizzle(conexao);

    const dias = await repositorio.dia.naJanela(
      OBRA,
      dia('2026-09-02'),
      dia('2026-09-03'),
    );

    // Fechada: as duas pontas entram. Do mais recente para o mais antigo, que é
    // a ordem em que o painel abre a obra.
    expect(dias.map((d) => d.data)).toEqual(['2026-09-03', '2026-09-02']);
  });

  it('o acumulado soma até o dia, inclusive, e para aí', async () => {
    const repositorio = criaRepositorioDrizzle(conexao);
    const casos = casosDoBanco();
    for (const [data, valor] of [
      ['2026-09-02', '1'],
      ['2026-09-03', '2'],
      ['2026-09-04', '4'],
    ] as const) {
      await casos.recebeProducao(
        { obraId: OBRA, data, servico: { tipo: 'id', id: SERVICO }, quantidade: valor },
        { usuarioId: C1 },
      );
    }

    const ateODia = await repositorio.producao.ate(OBRA, dia('2026-09-03'));

    // `data <= ate`: o dia consultado entra, o seguinte não.
    expect(ateODia.map((p) => p.data).sort()).toEqual(['2026-09-02', '2026-09-03']);
  });
});

/**
 * `executaEmTransacao` contra o Postgres.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/arquitetura/v1.md`, 4.1: "o primeiro lançamento do dia cria a linha
 *   de `dia_de_obra` na mesma transação. Isso elimina de vez o estado 'tem
 *   atividade mas o dia é não lançado'";
 * - `repositorio.ts`, `executaEmTransacao`: "Tudo ou nada [...] sem isso, um
 *   lançamento recusado deixaria para trás um dia declarado que ninguém
 *   declarou";
 * - decisão 4.2 (`regras-rdo` §5): `não lançado` é a AUSÊNCIA de linha. Um dia
 *   que sobra de um lançamento desfeito passa a aparecer como `trabalhado` no
 *   painel, que é dizer ao engenheiro que houve trabalho onde não houve.
 *
 * Por que este bloco existe agora: no `better-sqlite3` a transação era
 * síncrona e o desfazimento vinha de graça. No Postgres ela é assíncrona e o
 * Drizzle a entrega num objeto `tx` próprio — escrever no `db` de fora, de
 * dentro dela, grava FORA da transação, e o desfazimento não alcança.
 */
describe('executaEmTransacao', () => {
  const DATA = '2026-09-03';

  /**
   * Arma o `db` de fora: daqui em diante, qualquer consulta que parta dele
   * estoura em vez de ir ao banco.
   *
   * **Por que a prova precisa ser estrutural.** No PGlite o `db` e o `tx`
   * dividem a ÚNICA conexão do processo: uma escrita feita pelo `db` de fora
   * entraria na mesma transação, e o desfazimento a alcançaria — o defeito
   * ficaria invisível justamente no teste. No Neon são conexões diferentes, e a
   * mesma escrita ficaria gravada depois do `ROLLBACK`. Então o que se verifica
   * aqui é a origem da chamada, e não o efeito dela.
   *
   * `transaction` NÃO é armado: é por ele que a transação começa, e é a única
   * chamada legítima no `db` de fora.
   */
  function armaODbDeFora(db: BancoRdo): void {
    const estoura = (metodo: string) => () => {
      throw new Error(`Escrita fora da transação: \`db.${metodo}\` em vez do \`tx\`.`);
    };
    vi.spyOn(db, 'select').mockImplementation(estoura('select'));
    vi.spyOn(db, 'insert').mockImplementation(estoura('insert'));
    vi.spyOn(db, 'update').mockImplementation(estoura('update'));
  }

  it('tudo que a operação escreve passa pelo tx, nunca pelo db de fora', async () => {
    const repositorio = criaRepositorioDrizzle(conexao);
    armaODbDeFora(conexao.db);

    await repositorio.executaEmTransacao(async () => {
      await repositorio.dia.salva(diaTrabalhado(DATA));
      await repositorio.atividades.grava(atividade(DATA));
    });

    // Restaurado antes de conferir: a leitura de conferência é de fora mesmo.
    vi.restoreAllMocks();
    const gravado = await repositorio.dia.obtem(OBRA, dia(DATA));
    expect(gravado?.estado).toBe('trabalhado');
    expect(await repositorio.atividades.doDia(OBRA, dia(DATA))).toHaveLength(1);
  });

  it('a exceção na operação desfaz tudo, inclusive a linha de dia_de_obra', async () => {
    const repositorio = criaRepositorioDrizzle(conexao);
    const recusa = new Error('lançamento recusado depois de o dia ser criado');

    await expect(
      repositorio.executaEmTransacao(async () => {
        await repositorio.dia.salva(diaTrabalhado(DATA));
        await repositorio.atividades.grava(atividade(DATA));
        throw recusa;
      }),
    ).rejects.toBe(recusa);

    expect(await repositorio.dia.obtem(OBRA, dia(DATA))).toBeNull();
    expect(await repositorio.atividades.doDia(OBRA, dia(DATA))).toHaveLength(0);
    expect(await conexao.db.select().from(diaDeObra)).toHaveLength(0);
    expect(await conexao.db.select().from(lancamentoAtividade)).toHaveLength(0);
  });

  /**
   * O motivo real da transação, ponta a ponta: o lançamento é recusado **pelo
   * banco**, depois de o dia já ter sido criado. O status existe para a porta e
   * não existe na tabela, o que viola a chave estrangeira no `INSERT`.
   */
  it('o lançamento recusado pelo banco não deixa o dia criado para trás', async () => {
    const fantasma = idConfiavel<'status_atividade'>(
      '55555555-5555-4555-8555-555555555555',
    );
    const casos = criaCasosDeLancamento({
      repositorio: criaRepositorioDrizzle(conexao),
      portas: {
        ...portas,
        status: {
          ...portas.status,
          porId: (id) =>
            Promise.resolve(id === fantasma ? { id: fantasma, termo: 'Produção' } : null),
        },
      },
      relogio,
    });

    await expect(
      casos.lancaAtividade(
        {
          obraId: OBRA,
          data: dia(DATA),
          descricao: 'Fresagem da Rua A',
          status: { tipo: 'id', id: fantasma },
          chaveDeRascunho: null,
        },
        { usuarioId: C1 },
      ),
    ).rejects.toThrow();

    expect(await conexao.db.select().from(diaDeObra)).toHaveLength(0);
  });
});
