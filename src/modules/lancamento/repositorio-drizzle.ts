/**
 * Implementação do repositório sobre o esquema físico.
 *
 * Lê e escreve **só** as cinco tabelas do módulo: `dia_de_obra` e as quatro de
 * lançamento (arquitetura 4.1, item 4). Nenhuma consulta daqui toca obra,
 * pessoa, equipamento, serviço ou taxonomia — isso chega por porta.
 *
 * Toda consulta filtra por `obra_id`, sem exceção: é a segunda camada da
 * fronteira de confiança, a que sobra quando alguém escreve uma rota nova e
 * esquece a primeira.
 *
 * A conversão de quantidade acontece aqui e só aqui: o domínio calcula com
 * `Decimal`, o banco guarda `INTEGER` em milésimos.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { diaPuroConfiavel, type DiaPuro } from '../../shared/date/dia';
import { deMilesimos, paraMilesimos } from '../../shared/decimal';
import {
  idConfiavel,
  type LancamentoId,
  type ObraId,
  type UsuarioId,
} from '../../shared/id';
import type { BancoRdo, ConexaoRdo } from '../../db';
import {
  diaDeObra as tabelaDia,
  lancamentoAtividade,
  lancamentoObservacao,
  lancamentoPluviometria,
  lancamentoProducao,
} from '../../db/schema';
import type { Colecao, ColecaoDeProducao, RepositorioDeLancamento } from './repositorio';
import type {
  DiaDeObra,
  Exclusao,
  LinhaComum,
  LinhaDeAtividade,
  LinhaDeObservacao,
  LinhaDePluviometria,
  LinhaDeProducao,
} from './tipos';

type LinhaCrua = {
  id: LancamentoId;
  obraId: ObraId;
  data: DiaPuro;
  autorId: UsuarioId;
  registradoEm: string;
  atualizadoPor: UsuarioId | null;
  atualizadoEm: string | null;
  raizId: LancamentoId;
  retificaId: LancamentoId | null;
  chaveDeRascunho: string | null;
  excluidoPor: UsuarioId | null;
  excluidoEm: string | null;
  motivoExclusao: string | null;
};

/**
 * As três colunas da exclusão viram um objeto só, ou nada.
 *
 * O CHECK do esquema garante que elas são nulas juntas ou preenchidas juntas,
 * então a conversão não tem caso do meio. `motivoExclusao` entra na condição
 * para que o compilador não precise de `as` nem de `!`.
 */
function exclusaoDoBanco(linha: LinhaCrua): Exclusao | null {
  if (linha.excluidoPor === null || linha.excluidoEm === null) return null;
  if (linha.motivoExclusao === null) return null;
  return { por: linha.excluidoPor, em: linha.excluidoEm, motivo: linha.motivoExclusao };
}

function comumDoBanco(linha: LinhaCrua): LinhaComum {
  return {
    id: linha.id,
    obraId: linha.obraId,
    data: linha.data,
    autorId: linha.autorId,
    registradoEm: linha.registradoEm,
    atualizadoPor: linha.atualizadoPor,
    atualizadoEm: linha.atualizadoEm,
    raizId: linha.raizId,
    retificaId: linha.retificaId,
    chaveDeRascunho: linha.chaveDeRascunho,
    exclusao: exclusaoDoBanco(linha),
  };
}

function comumParaOBanco(linha: LinhaComum): LinhaCrua {
  return {
    id: linha.id,
    obraId: linha.obraId,
    data: linha.data,
    autorId: linha.autorId,
    registradoEm: linha.registradoEm,
    atualizadoPor: linha.atualizadoPor,
    atualizadoEm: linha.atualizadoEm,
    raizId: linha.raizId,
    retificaId: linha.retificaId,
    chaveDeRascunho: linha.chaveDeRascunho,
    excluidoPor: linha.exclusao?.por ?? null,
    excluidoEm: linha.exclusao?.em ?? null,
    motivoExclusao: linha.exclusao?.motivo ?? null,
  };
}

/** As três colunas do `UPDATE` de exclusão. Uma forma, quatro tabelas. */
function colunasDaExclusao(exclusao: Exclusao) {
  return {
    excluidoPor: exclusao.por,
    excluidoEm: exclusao.em,
    motivoExclusao: exclusao.motivo,
  };
}

/**
 * Conjunto vazio não vira `IN ()`.
 *
 * `inArray` com lista vazia não é SQL válido em todo dialeto, e a resposta
 * certa é conhecida sem ir ao banco: nada. A verificação fica aqui, num lugar
 * só, e não repetida em cada uma das cinco consultas de conjunto.
 */
function conjuntoVazio(datas: readonly DiaPuro[]): boolean {
  return datas.length === 0;
}

/**
 * A transação em curso, se houver, e o banco a que ela pertence.
 *
 * ## Por que existe, desde 17/09/2026
 *
 * No `better-sqlite3` a transação era `BEGIN`/`COMMIT` **na conexão**, então
 * toda consulta feita durante ela já estava dentro dela, sem ninguém precisar
 * saber. No Postgres não é assim: `db.transaction()` entrega um objeto `tx`
 * amarrado a UMA conexão do pool, e o que for escrito pelo `db` de fora sai por
 * outra conexão — ou seja, **fora da transação**. O `ROLLBACK` não alcança essa
 * escrita, e o dia criado por um lançamento recusado ficaria gravado, que é
 * exatamente o estado que `executaEmTransacao` existe para impedir
 * (`repositorio.ts`, e arquitetura 4.1).
 *
 * ## Por que `AsyncLocalStorage`, e não uma variável
 *
 * Porque a operação é assíncrona e duas podem correr entrelaçadas no mesmo
 * processo. Uma variável de módulo mandaria a escrita de uma requisição para a
 * transação de outra — defeito que só aparece sob carga, e que corrompe o
 * documento de um dia com o lançamento de outro. O contexto assíncrono
 * acompanha cada `await` da operação e de mais ninguém.
 *
 * O `db` é guardado junto com o `tx` de propósito: o repositório de uma
 * conexão nunca escreve na transação de outra, e o teste abre um banco por
 * caso.
 */
const transacaoEmCurso = new AsyncLocalStorage<{
  readonly db: BancoRdo;
  readonly tx: BancoRdo;
}>();

/**
 * O alvo de TODA consulta do repositório: o `tx` enquanto há transação em
 * curso, o `db` fora dela.
 *
 * Nenhum método deste arquivo fala com `conexao.db` direto. É essa ausência —
 * e não a disciplina de quem escreve — que garante que a escrita de dentro da
 * transação não escape por fora dela.
 */
function alvoDaConsulta(db: BancoRdo): BancoRdo {
  const emCurso = transacaoEmCurso.getStore();
  return emCurso !== undefined && emCurso.db === db ? emCurso.tx : db;
}

export function criaRepositorioDrizzle(conexao: ConexaoRdo): RepositorioDeLancamento {
  const banco = conexao.db;
  const db = () => alvoDaConsulta(banco);

  const atividades: Colecao<LinhaDeAtividade> = {
    doDia: async (obraId, data) =>
      (
        await db()
          .select()
          .from(lancamentoAtividade)
          .where(
            and(
              eq(lancamentoAtividade.obraId, obraId),
              eq(lancamentoAtividade.data, data),
            ),
          )
      ).map(atividadeDoBanco),
    dosDias: async (obraId, datas) =>
      conjuntoVazio(datas)
        ? []
        : (
            await db()
              .select()
              .from(lancamentoAtividade)
              .where(
                and(
                  eq(lancamentoAtividade.obraId, obraId),
                  inArray(lancamentoAtividade.data, [...datas]),
                ),
              )
              .orderBy(asc(lancamentoAtividade.data))
          ).map(atividadeDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db()
        .select()
        .from(lancamentoAtividade)
        .where(
          and(eq(lancamentoAtividade.obraId, obraId), eq(lancamentoAtividade.id, id)),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : atividadeDoBanco(primeira);
    },
    cadeia: async (obraId, raizId) =>
      (
        await db()
          .select()
          .from(lancamentoAtividade)
          .where(
            and(
              eq(lancamentoAtividade.obraId, obraId),
              eq(lancamentoAtividade.raizId, raizId),
            ),
          )
      ).map(atividadeDoBanco),
    porRascunho: async (autorId, chave) => {
      const achadas = await db()
        .select()
        .from(lancamentoAtividade)
        .where(
          and(
            eq(lancamentoAtividade.autorId, autorId),
            eq(lancamentoAtividade.chaveDeRascunho, chave),
          ),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : atividadeDoBanco(primeira);
    },
    grava: async (linha) => {
      await db()
        .insert(lancamentoAtividade)
        .values({
          ...comumParaOBanco(linha),
          descricao: linha.descricao,
          statusId: linha.statusId,
        });
    },
    atualiza: async (linha) => {
      await db()
        .update(lancamentoAtividade)
        .set({
          descricao: linha.descricao,
          statusId: linha.statusId,
          atualizadoPor: linha.atualizadoPor,
          atualizadoEm: linha.atualizadoEm,
        })
        .where(
          and(
            eq(lancamentoAtividade.obraId, linha.obraId),
            eq(lancamentoAtividade.id, linha.id),
          ),
        );
    },
    // `UPDATE`, nunca `DELETE`: a linha do lançamento excluído fica (30.1).
    marcaExcluido: async (obraId, id, exclusao) => {
      await db()
        .update(lancamentoAtividade)
        .set(colunasDaExclusao(exclusao))
        .where(
          and(eq(lancamentoAtividade.obraId, obraId), eq(lancamentoAtividade.id, id)),
        );
    },
  };

  const producao: ColecaoDeProducao = {
    doDia: async (obraId, data) =>
      (
        await db()
          .select()
          .from(lancamentoProducao)
          .where(
            and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.data, data)),
          )
      ).map(producaoDoBanco),
    dosDias: async (obraId, datas) =>
      conjuntoVazio(datas)
        ? []
        : (
            await db()
              .select()
              .from(lancamentoProducao)
              .where(
                and(
                  eq(lancamentoProducao.obraId, obraId),
                  inArray(lancamentoProducao.data, [...datas]),
                ),
              )
              .orderBy(asc(lancamentoProducao.data))
          ).map(producaoDoBanco),
    ate: async (obraId, ate) =>
      (
        await db()
          .select()
          .from(lancamentoProducao)
          .where(
            and(eq(lancamentoProducao.obraId, obraId), lte(lancamentoProducao.data, ate)),
          )
      ).map(producaoDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db()
        .select()
        .from(lancamentoProducao)
        .where(and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.id, id)))
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : producaoDoBanco(primeira);
    },
    cadeia: async (obraId, raizId) =>
      (
        await db()
          .select()
          .from(lancamentoProducao)
          .where(
            and(
              eq(lancamentoProducao.obraId, obraId),
              eq(lancamentoProducao.raizId, raizId),
            ),
          )
      ).map(producaoDoBanco),
    porRascunho: async (autorId, chave) => {
      const achadas = await db()
        .select()
        .from(lancamentoProducao)
        .where(
          and(
            eq(lancamentoProducao.autorId, autorId),
            eq(lancamentoProducao.chaveDeRascunho, chave),
          ),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : producaoDoBanco(primeira);
    },
    grava: async (linha) => {
      await db()
        .insert(lancamentoProducao)
        .values({
          ...comumParaOBanco(linha),
          servicoId: linha.servicoId,
          quantidadeMilesimos: paraMilesimos(linha.quantidade),
        });
    },
    atualiza: async (linha) => {
      await db()
        .update(lancamentoProducao)
        .set({
          servicoId: linha.servicoId,
          quantidadeMilesimos: paraMilesimos(linha.quantidade),
          atualizadoPor: linha.atualizadoPor,
          atualizadoEm: linha.atualizadoEm,
        })
        .where(
          and(
            eq(lancamentoProducao.obraId, linha.obraId),
            eq(lancamentoProducao.id, linha.id),
          ),
        );
    },
    marcaExcluido: async (obraId, id, exclusao) => {
      await db()
        .update(lancamentoProducao)
        .set(colunasDaExclusao(exclusao))
        .where(and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.id, id)));
    },
  };

  const pluviometria: Colecao<LinhaDePluviometria> = {
    doDia: async (obraId, data) =>
      (
        await db()
          .select()
          .from(lancamentoPluviometria)
          .where(
            and(
              eq(lancamentoPluviometria.obraId, obraId),
              eq(lancamentoPluviometria.data, data),
            ),
          )
      ).map(pluviometriaDoBanco),
    dosDias: async (obraId, datas) =>
      conjuntoVazio(datas)
        ? []
        : (
            await db()
              .select()
              .from(lancamentoPluviometria)
              .where(
                and(
                  eq(lancamentoPluviometria.obraId, obraId),
                  inArray(lancamentoPluviometria.data, [...datas]),
                ),
              )
              .orderBy(asc(lancamentoPluviometria.data))
          ).map(pluviometriaDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db()
        .select()
        .from(lancamentoPluviometria)
        .where(
          and(
            eq(lancamentoPluviometria.obraId, obraId),
            eq(lancamentoPluviometria.id, id),
          ),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : pluviometriaDoBanco(primeira);
    },
    cadeia: async (obraId, raizId) =>
      (
        await db()
          .select()
          .from(lancamentoPluviometria)
          .where(
            and(
              eq(lancamentoPluviometria.obraId, obraId),
              eq(lancamentoPluviometria.raizId, raizId),
            ),
          )
      ).map(pluviometriaDoBanco),
    porRascunho: async (autorId, chave) => {
      const achadas = await db()
        .select()
        .from(lancamentoPluviometria)
        .where(
          and(
            eq(lancamentoPluviometria.autorId, autorId),
            eq(lancamentoPluviometria.chaveDeRascunho, chave),
          ),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : pluviometriaDoBanco(primeira);
    },
    grava: async (linha) => {
      await db()
        .insert(lancamentoPluviometria)
        .values({
          ...comumParaOBanco(linha),
          noiteAnterior: linha.noiteAnterior,
          manha: linha.manha,
          tarde: linha.tarde,
          indiceMmMilesimos: paraMilesimos(linha.indiceMm),
        });
    },
    atualiza: async (linha) => {
      await db()
        .update(lancamentoPluviometria)
        .set({
          noiteAnterior: linha.noiteAnterior,
          manha: linha.manha,
          tarde: linha.tarde,
          indiceMmMilesimos: paraMilesimos(linha.indiceMm),
          atualizadoPor: linha.atualizadoPor,
          atualizadoEm: linha.atualizadoEm,
        })
        .where(
          and(
            eq(lancamentoPluviometria.obraId, linha.obraId),
            eq(lancamentoPluviometria.id, linha.id),
          ),
        );
    },
    marcaExcluido: async (obraId, id, exclusao) => {
      await db()
        .update(lancamentoPluviometria)
        .set(colunasDaExclusao(exclusao))
        .where(
          and(
            eq(lancamentoPluviometria.obraId, obraId),
            eq(lancamentoPluviometria.id, id),
          ),
        );
    },
  };

  const observacoes: Colecao<LinhaDeObservacao> = {
    doDia: async (obraId, data) =>
      (
        await db()
          .select()
          .from(lancamentoObservacao)
          .where(
            and(
              eq(lancamentoObservacao.obraId, obraId),
              eq(lancamentoObservacao.data, data),
            ),
          )
      ).map(observacaoDoBanco),
    dosDias: async (obraId, datas) =>
      conjuntoVazio(datas)
        ? []
        : (
            await db()
              .select()
              .from(lancamentoObservacao)
              .where(
                and(
                  eq(lancamentoObservacao.obraId, obraId),
                  inArray(lancamentoObservacao.data, [...datas]),
                ),
              )
              .orderBy(asc(lancamentoObservacao.data))
          ).map(observacaoDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db()
        .select()
        .from(lancamentoObservacao)
        .where(
          and(eq(lancamentoObservacao.obraId, obraId), eq(lancamentoObservacao.id, id)),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : observacaoDoBanco(primeira);
    },
    cadeia: async (obraId, raizId) =>
      (
        await db()
          .select()
          .from(lancamentoObservacao)
          .where(
            and(
              eq(lancamentoObservacao.obraId, obraId),
              eq(lancamentoObservacao.raizId, raizId),
            ),
          )
      ).map(observacaoDoBanco),
    porRascunho: async (autorId, chave) => {
      const achadas = await db()
        .select()
        .from(lancamentoObservacao)
        .where(
          and(
            eq(lancamentoObservacao.autorId, autorId),
            eq(lancamentoObservacao.chaveDeRascunho, chave),
          ),
        )
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : observacaoDoBanco(primeira);
    },
    grava: async (linha) => {
      await db()
        .insert(lancamentoObservacao)
        .values({ ...comumParaOBanco(linha), lado: linha.lado, texto: linha.texto });
    },
    atualiza: async (linha) => {
      await db()
        .update(lancamentoObservacao)
        .set({
          texto: linha.texto,
          atualizadoPor: linha.atualizadoPor,
          atualizadoEm: linha.atualizadoEm,
        })
        .where(
          and(
            eq(lancamentoObservacao.obraId, linha.obraId),
            eq(lancamentoObservacao.id, linha.id),
          ),
        );
    },
    marcaExcluido: async (obraId, id, exclusao) => {
      await db()
        .update(lancamentoObservacao)
        .set(colunasDaExclusao(exclusao))
        .where(
          and(eq(lancamentoObservacao.obraId, obraId), eq(lancamentoObservacao.id, id)),
        );
    },
  };

  return {
    dia: {
      obtem: async (obraId, data) => {
        const achados = await db()
          .select()
          .from(tabelaDia)
          .where(and(eq(tabelaDia.obraId, obraId), eq(tabelaDia.data, data)))
          .limit(1);
        const primeiro = achados[0];
        if (primeiro === undefined) return null;
        return diaDoBanco(primeiro);
      },
      naJanela: async (obraId, de, ate) => {
        const achados = await db()
          .select()
          .from(tabelaDia)
          .where(
            and(
              eq(tabelaDia.obraId, obraId),
              gte(tabelaDia.data, de),
              lte(tabelaDia.data, ate),
            ),
          )
          .orderBy(desc(tabelaDia.data));
        return achados.map(diaDoBanco);
      },
      nosDias: async (obraId, datas) => {
        if (conjuntoVazio(datas)) return [];
        const achados = await db()
          .select()
          .from(tabelaDia)
          .where(and(eq(tabelaDia.obraId, obraId), inArray(tabelaDia.data, [...datas])))
          .orderBy(asc(tabelaDia.data));
        return achados.map(diaDoBanco);
      },
      salva: async (dia: DiaDeObra) => {
        // PK natural `(obra_id, data)`: o mesmo dia nunca vira duas linhas.
        await db()
          .insert(tabelaDia)
          .values({
            obraId: dia.obraId,
            data: dia.data,
            estado: dia.estado,
            motivoParada: dia.motivoParada,
            registradoPor: dia.registradoPor,
            registradoEm: dia.registradoEm,
            atualizadoPor: dia.atualizadoPor,
            atualizadoEm: dia.atualizadoEm,
            fechadoPor: dia.fechadoPor,
            fechadoEm: dia.fechadoEm,
            numeroRdoCongelado: dia.numeroRdoCongelado,
          })
          .onConflictDoUpdate({
            target: [tabelaDia.obraId, tabelaDia.data],
            set: {
              estado: dia.estado,
              motivoParada: dia.motivoParada,
              atualizadoPor: dia.atualizadoPor,
              atualizadoEm: dia.atualizadoEm,
              fechadoPor: dia.fechadoPor,
              fechadoEm: dia.fechadoEm,
              numeroRdoCongelado: dia.numeroRdoCongelado,
            },
          });
      },
    },
    atividades,
    producao,
    pluviometria,
    observacoes,
    /**
     * Transação explícita. Tudo ou nada.
     *
     * Existe para que um lançamento recusado **depois** de o dia ter sido criado
     * não deixe um `dia_de_obra` que ninguém declarou. Decisão 4.2: `não
     * lançado` é a ausência de linha, e um dia que sobra passa a dizer ao
     * engenheiro que houve trabalho onde não houve.
     *
     * O `BEGIN`/`COMMIT` na conexão foi trocado por `transaction` do Drizzle: no
     * Postgres a transação é um objeto próprio, e o que não passar por ele grava
     * fora dela. A operação corre dentro do contexto assíncrono que aponta o
     * `tx` — é assim que TODA consulta feita por ela, inclusive as das quatro
     * coleções, cai dentro da transação sem que quem chama precise saber disso.
     *
     * Aninhar é seguro: `alvoDaConsulta` já devolve o `tx` de fora, e
     * `tx.transaction()` abre um SAVEPOINT em vez de uma segunda transação — que
     * numa segunda conexão do pool travaria esperando a primeira.
     *
     * O driver `neon-http` não serve aqui: ele não suporta transação. Ver
     * `src/db/index.ts`.
     */
    executaEmTransacao: (operacao) =>
      db().transaction(async (tx) => transacaoEmCurso.run({ db: banco, tx }, operacao)),
  };
}

/** As onze colunas de `dia_de_obra`, numa conversão só: três leituras a usam. */
function diaDoBanco(linha: typeof tabelaDia.$inferSelect): DiaDeObra {
  return {
    obraId: linha.obraId,
    data: diaPuroConfiavel(linha.data),
    estado: linha.estado,
    motivoParada: linha.motivoParada,
    registradoPor: linha.registradoPor,
    registradoEm: linha.registradoEm,
    atualizadoPor: linha.atualizadoPor,
    atualizadoEm: linha.atualizadoEm,
    fechadoPor: linha.fechadoPor,
    fechadoEm: linha.fechadoEm,
    numeroRdoCongelado: linha.numeroRdoCongelado,
  };
}

function atividadeDoBanco(
  linha: typeof lancamentoAtividade.$inferSelect,
): LinhaDeAtividade {
  return {
    ...comumDoBanco({ ...linha, data: diaPuroConfiavel(linha.data) }),
    tipo: 'atividade',
    descricao: linha.descricao,
    statusId: linha.statusId,
  };
}

function producaoDoBanco(linha: typeof lancamentoProducao.$inferSelect): LinhaDeProducao {
  return {
    ...comumDoBanco({ ...linha, data: diaPuroConfiavel(linha.data) }),
    tipo: 'producao',
    servicoId: linha.servicoId,
    quantidade: deMilesimos(linha.quantidadeMilesimos),
  };
}

function pluviometriaDoBanco(
  linha: typeof lancamentoPluviometria.$inferSelect,
): LinhaDePluviometria {
  return {
    ...comumDoBanco({ ...linha, data: diaPuroConfiavel(linha.data) }),
    tipo: 'pluviometria',
    noiteAnterior: linha.noiteAnterior,
    manha: linha.manha,
    tarde: linha.tarde,
    indiceMm: deMilesimos(linha.indiceMmMilesimos),
  };
}

function observacaoDoBanco(
  linha: typeof lancamentoObservacao.$inferSelect,
): LinhaDeObservacao {
  return {
    ...comumDoBanco({ ...linha, data: diaPuroConfiavel(linha.data) }),
    tipo: 'observacao',
    lado: linha.lado,
    texto: linha.texto,
  };
}

/** Id vindo do banco, já gravado. Não vale para entrada de usuário. */
export function lancamentoIdDoBanco(valor: string): LancamentoId {
  return idConfiavel<'lancamento'>(valor);
}
