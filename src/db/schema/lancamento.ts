/**
 * Os quatro lançamentos: atividade, produção, pluviometria e observação.
 *
 * docs/arquitetura/v1.md, 2.18 a 2.21. **Lançamento é o registro atômico** com
 * data a que se refere, autor e hora de registro (R16). O RDO diário, semanal e
 * mensal são visões calculadas sobre estas quatro tabelas; nenhuma delas guarda
 * RDO montado.
 *
 * Quatro invariantes valem para as quatro tabelas:
 *
 * 1. **FK composta para o dia.** Um lançamento só existe se o dia existir. Isso
 *    elimina de vez o estado "tem atividade mas o dia é não lançado".
 * 2. **Cadeia linear de retificação.** `UNIQUE (retifica_id)` impede duas
 *    retificações do mesmo lançamento, ou seja, impede bifurcação: com
 *    bifurcação, "a versão vigente" deixa de ter resposta única.
 * 3. **`raiz_id` é gravado no insert e nunca muda.** Serve para achar a cadeia
 *    em O(1) e para ordenar pela hora de registro do ORIGINAL (R11) — sem isso,
 *    retificar uma atividade a jogaria para o fim da lista e o RDO mudaria de
 *    ordem entre duas exportações.
 * 4. **A FK composta da retificação amarra obra e data.** Uma retificação não
 *    consegue mover um lançamento para outro dia nem para outra obra.
 */

import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type {
  LancamentoId,
  ObraId,
  ServicoControladoId,
  StatusAtividadeId,
} from '../../shared/id';
import type { LetraDeTurno } from '../../shared/taxonomia';
import {
  checkDia,
  checkInstante,
  checkInstanteOpcional,
  checkMilesimosPositivo,
  checkTextoNaoVazio,
  colunaDia,
  colunaInstante,
  colunaInstanteOpcional,
  colunaMilesimos,
} from './convencoes';
import { diaDeObra } from './dia-de-obra';
import { servicoControlado } from './servico';
import { statusAtividade } from './taxonomia';
import { colunaAutor, colunaAutorOpcional } from './usuario';

/**
 * As colunas que todo lançamento tem. Escritas uma vez para que nenhuma das
 * quatro tabelas perca a autoria ou a cadeia de retificação numa migration
 * futura.
 */
function colunasComuns() {
  return {
    id: text('id').$type<LancamentoId>().primaryKey(),
    obraId: text('obra_id').$type<ObraId>().notNull(),
    /** A data A QUE O LANÇAMENTO SE REFERE. Dia puro, escolhido por quem lança. */
    data: colunaDia('data'),
    autorId: colunaAutor('autor_id'),
    /**
     * A hora de registro, do SERVIDOR, nunca do aparelho. Campo diferente da
     * data: um lançamento feito às 23h no celular pertence ao dia que o
     * encarregado escolheu (caso de teste obrigatório 15).
     */
    registradoEm: colunaInstante('registrado_em'),
    atualizadoPor: colunaAutorOpcional('atualizado_por'),
    atualizadoEm: colunaInstanteOpcional('atualizado_em'),
    /** Id da cadeia: no original, o próprio `id`. */
    raizId: text('raiz_id').$type<LancamentoId>().notNull(),
    /** Nulo no original. Preenchido só por retificação de dia fechado (22.1). */
    retificaId: text('retifica_id').$type<LancamentoId>(),
    /** Idempotência do envio offline: reenviar o mesmo rascunho não duplica. */
    chaveDeRascunho: text('chave_de_rascunho'),
  };
}

export const lancamentoAtividade = sqliteTable(
  'lancamento_atividade',
  {
    ...colunasComuns(),
    descricao: text('descricao').notNull(),
    /** Referência ao cadastro (R21). A planilha tem 3 atividades sem status. */
    statusId: text('status_id')
      .$type<StatusAtividadeId>()
      .notNull()
      .references(() => statusAtividade.id, {
        onDelete: 'restrict',
        onUpdate: 'restrict',
      }),
  },
  (t) => [
    uniqueIndex('ux_atividade_id_obra_data').on(t.id, t.obraId, t.data),
    foreignKey({
      columns: [t.obraId, t.data],
      foreignColumns: [diaDeObra.obraId, diaDeObra.data],
      name: 'fk_atividade_dia',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.retificaId, t.obraId, t.data],
      foreignColumns: [t.id, t.obraId, t.data],
      name: 'fk_atividade_retifica',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    uniqueIndex('ux_atividade_retifica').on(t.retificaId),
    uniqueIndex('ux_atividade_rascunho').on(t.autorId, t.chaveDeRascunho),
    // Ordem do bloco 8: raiz.registrado_em, raiz.id.
    index('idx_atividade_dia').on(t.obraId, t.data, t.registradoEm),
    index('idx_atividade_raiz').on(t.raizId),
    checkDia('ck_atividade_data', t.data),
    checkTextoNaoVazio('ck_atividade_descricao', t.descricao),
    checkInstante('ck_atividade_registrado_em', t.registradoEm),
    checkInstanteOpcional('ck_atividade_atualizado_em', t.atualizadoEm),
  ],
);

export const lancamentoProducao = sqliteTable(
  'lancamento_producao',
  {
    ...colunasComuns(),
    servicoId: text('servico_id').$type<ServicoControladoId>().notNull(),
    /** Decisão 13.3: maior que zero. "Não houve produção" é a ausência da linha. */
    quantidadeMilesimos: colunaMilesimos('quantidade_milesimos'),
  },
  (t) => [
    uniqueIndex('ux_producao_id_obra_data').on(t.id, t.obraId, t.data),
    foreignKey({
      columns: [t.obraId, t.data],
      foreignColumns: [diaDeObra.obraId, diaDeObra.data],
      name: 'fk_producao_dia',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    // Casamento por referência ao cadastro, nunca por igualdade de texto (R5).
    foreignKey({
      columns: [t.servicoId, t.obraId],
      foreignColumns: [servicoControlado.id, servicoControlado.obraId],
      name: 'fk_producao_servico',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.retificaId, t.obraId, t.data],
      foreignColumns: [t.id, t.obraId, t.data],
      name: 'fk_producao_retifica',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    uniqueIndex('ux_producao_retifica').on(t.retificaId),
    uniqueIndex('ux_producao_rascunho').on(t.autorId, t.chaveDeRascunho),
    // O acumulado é SUM(quantidade_milesimos) com data <= D, recalculado do
    // zero em toda consulta. Não existe tabela de saldo nem coluna de
    // acumulado: a resposta para o custo é este índice, nunca duplicação.
    index('idx_producao_acumulado').on(t.obraId, t.servicoId, t.data),
    index('idx_producao_raiz').on(t.raizId),
    checkDia('ck_producao_data', t.data),
    checkMilesimosPositivo('ck_producao_quantidade', t.quantidadeMilesimos),
    checkInstante('ck_producao_registrado_em', t.registradoEm),
    checkInstanteOpcional('ck_producao_atualizado_em', t.atualizadoEm),
  ],
);

export const lancamentoPluviometria = sqliteTable(
  'lancamento_pluviometria',
  {
    ...colunasComuns(),
    /** Turno em branco é válido e sai vazio no PDF (decisão 2.2). */
    noiteAnterior: text('noite_anterior').$type<LetraDeTurno>(),
    manha: text('manha').$type<LetraDeTurno>(),
    tarde: text('tarde').$type<LetraDeTurno>(),
    /** Índice em mm, em milésimos. Aceita zero: chuva com 0 mm é caso real (3.2). */
    indiceMmMilesimos: colunaMilesimos('indice_mm_milesimos'),
  },
  (t) => [
    uniqueIndex('ux_pluviometria_id_obra_data').on(t.id, t.obraId, t.data),
    foreignKey({
      columns: [t.obraId, t.data],
      foreignColumns: [diaDeObra.obraId, diaDeObra.data],
      name: 'fk_pluviometria_dia',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.retificaId, t.obraId, t.data],
      foreignColumns: [t.id, t.obraId, t.data],
      name: 'fk_pluviometria_retifica',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    uniqueIndex('ux_pluviometria_retifica').on(t.retificaId),
    uniqueIndex('ux_pluviometria_rascunho').on(t.autorId, t.chaveDeRascunho),
    // UMA cadeia de pluviometria por dia. Com a cadeia linear, existe
    // exatamente uma versão vigente, e o bloco 9 nunca escolhe entre duas.
    uniqueIndex('ux_pluviometria_dia')
      .on(t.obraId, t.data)
      .where(sql`${t.retificaId} IS NULL`),
    index('idx_pluviometria_raiz').on(t.raizId),
    checkDia('ck_pluviometria_data', t.data),
    // A letra `N`, que a macro VBA pintava, não existe: a árvore do resumo do
    // dia não a conhece e nenhuma outra parte da planilha a aceitava.
    check(
      'ck_pluviometria_noite',
      sql`${t.noiteAnterior} IS NULL OR ${t.noiteAnterior} IN ('B', 'C', 'I')`,
    ),
    check(
      'ck_pluviometria_manha',
      sql`${t.manha} IS NULL OR ${t.manha} IN ('B', 'C', 'I')`,
    ),
    check(
      'ck_pluviometria_tarde',
      sql`${t.tarde} IS NULL OR ${t.tarde} IN ('B', 'C', 'I')`,
    ),
    // R23: não negativo. O teto de 1.000.000 milésimos (1000 mm num dia) é
    // sanidade, não regra de negócio.
    check(
      'ck_pluviometria_indice',
      sql`${t.indiceMmMilesimos} >= 0 AND ${t.indiceMmMilesimos} <= 1000000`,
    ),
    checkInstante('ck_pluviometria_registrado_em', t.registradoEm),
    checkInstanteOpcional('ck_pluviometria_atualizado_em', t.atualizadoEm),
  ],
);

export const lancamentoObservacao = sqliteTable(
  'lancamento_observacao',
  {
    ...colunasComuns(),
    /**
     * Decisão 10.1: na v1 `COMENTÁRIO CONTRATANTE` sai sempre vazio, porque o
     * fluxo do contratante está fora do escopo. O CHECK restrito a `CROS` é
     * deliberado: uma rota nova que esquecesse a validação esbarraria no banco.
     * Abrir o bloco na v1.1 é uma migration de uma linha.
     */
    lado: text('lado').$type<'CROS'>().notNull(),
    texto: text('texto').notNull(),
  },
  (t) => [
    uniqueIndex('ux_observacao_id_obra_data').on(t.id, t.obraId, t.data),
    foreignKey({
      columns: [t.obraId, t.data],
      foreignColumns: [diaDeObra.obraId, diaDeObra.data],
      name: 'fk_observacao_dia',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    foreignKey({
      columns: [t.retificaId, t.obraId, t.data],
      foreignColumns: [t.id, t.obraId, t.data],
      name: 'fk_observacao_retifica',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    uniqueIndex('ux_observacao_retifica').on(t.retificaId),
    uniqueIndex('ux_observacao_rascunho').on(t.autorId, t.chaveDeRascunho),
    index('idx_observacao_dia').on(t.obraId, t.data, t.lado, t.registradoEm),
    index('idx_observacao_raiz').on(t.raizId),
    checkDia('ck_observacao_data', t.data),
    check('ck_observacao_lado', sql`${t.lado} = 'CROS'`),
    checkTextoNaoVazio('ck_observacao_texto', t.texto),
    checkInstante('ck_observacao_registrado_em', t.registradoEm),
    checkInstanteOpcional('ck_observacao_atualizado_em', t.atualizadoEm),
  ],
);
