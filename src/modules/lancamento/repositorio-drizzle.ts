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

import { and, eq, lte } from 'drizzle-orm';

import { diaPuroConfiavel, type DiaPuro } from '../../shared/date/dia';
import { deMilesimos, paraMilesimos } from '../../shared/decimal';
import {
  idConfiavel,
  type LancamentoId,
  type ObraId,
  type UsuarioId,
} from '../../shared/id';
import type { ConexaoRdo } from '../../db';
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

export function criaRepositorioDrizzle(conexao: ConexaoRdo): RepositorioDeLancamento {
  const { db, sqlite } = conexao;

  const atividades: Colecao<LinhaDeAtividade> = {
    doDia: async (obraId, data) =>
      (
        await db
          .select()
          .from(lancamentoAtividade)
          .where(
            and(
              eq(lancamentoAtividade.obraId, obraId),
              eq(lancamentoAtividade.data, data),
            ),
          )
      ).map(atividadeDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db
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
        await db
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
      const achadas = await db
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
      await db.insert(lancamentoAtividade).values({
        ...comumParaOBanco(linha),
        descricao: linha.descricao,
        statusId: linha.statusId,
      });
    },
    atualiza: async (linha) => {
      await db
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
      await db
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
        await db
          .select()
          .from(lancamentoProducao)
          .where(
            and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.data, data)),
          )
      ).map(producaoDoBanco),
    ate: async (obraId, ate) =>
      (
        await db
          .select()
          .from(lancamentoProducao)
          .where(
            and(eq(lancamentoProducao.obraId, obraId), lte(lancamentoProducao.data, ate)),
          )
      ).map(producaoDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db
        .select()
        .from(lancamentoProducao)
        .where(and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.id, id)))
        .limit(1);
      const primeira = achadas[0];
      return primeira === undefined ? null : producaoDoBanco(primeira);
    },
    cadeia: async (obraId, raizId) =>
      (
        await db
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
      const achadas = await db
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
      await db.insert(lancamentoProducao).values({
        ...comumParaOBanco(linha),
        servicoId: linha.servicoId,
        quantidadeMilesimos: paraMilesimos(linha.quantidade),
      });
    },
    atualiza: async (linha) => {
      await db
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
      await db
        .update(lancamentoProducao)
        .set(colunasDaExclusao(exclusao))
        .where(and(eq(lancamentoProducao.obraId, obraId), eq(lancamentoProducao.id, id)));
    },
  };

  const pluviometria: Colecao<LinhaDePluviometria> = {
    doDia: async (obraId, data) =>
      (
        await db
          .select()
          .from(lancamentoPluviometria)
          .where(
            and(
              eq(lancamentoPluviometria.obraId, obraId),
              eq(lancamentoPluviometria.data, data),
            ),
          )
      ).map(pluviometriaDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db
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
        await db
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
      const achadas = await db
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
      await db.insert(lancamentoPluviometria).values({
        ...comumParaOBanco(linha),
        noiteAnterior: linha.noiteAnterior,
        manha: linha.manha,
        tarde: linha.tarde,
        indiceMmMilesimos: paraMilesimos(linha.indiceMm),
      });
    },
    atualiza: async (linha) => {
      await db
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
      await db
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
        await db
          .select()
          .from(lancamentoObservacao)
          .where(
            and(
              eq(lancamentoObservacao.obraId, obraId),
              eq(lancamentoObservacao.data, data),
            ),
          )
      ).map(observacaoDoBanco),
    porId: async (obraId, id) => {
      const achadas = await db
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
        await db
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
      const achadas = await db
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
      await db
        .insert(lancamentoObservacao)
        .values({ ...comumParaOBanco(linha), lado: linha.lado, texto: linha.texto });
    },
    atualiza: async (linha) => {
      await db
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
      await db
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
        const achados = await db
          .select()
          .from(tabelaDia)
          .where(and(eq(tabelaDia.obraId, obraId), eq(tabelaDia.data, data)))
          .limit(1);
        const primeiro = achados[0];
        if (primeiro === undefined) return null;
        return {
          obraId: primeiro.obraId,
          data: diaPuroConfiavel(primeiro.data),
          estado: primeiro.estado,
          motivoParada: primeiro.motivoParada,
          registradoPor: primeiro.registradoPor,
          registradoEm: primeiro.registradoEm,
          atualizadoPor: primeiro.atualizadoPor,
          atualizadoEm: primeiro.atualizadoEm,
          fechadoPor: primeiro.fechadoPor,
          fechadoEm: primeiro.fechadoEm,
          numeroRdoCongelado: primeiro.numeroRdoCongelado,
        };
      },
      salva: async (dia: DiaDeObra) => {
        // PK natural `(obra_id, data)`: o mesmo dia nunca vira duas linhas.
        await db
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
     * Transação explícita.
     *
     * O `better-sqlite3` é síncrono: entre o `BEGIN` e o `COMMIT` este módulo
     * não espera por nada além do próprio banco, então não há ponto de
     * interleaving real. A transação existe para que um lançamento recusado
     * depois da criação do dia não deixe um `dia_de_obra` que ninguém declarou.
     */
    executaEmTransacao: async (operacao) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const resultado = await operacao();
        sqlite.exec('COMMIT');
        return resultado;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
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
