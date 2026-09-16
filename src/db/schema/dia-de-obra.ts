/**
 * `dia_de_obra` — o estado do dia e a única exceção do sistema.
 *
 * docs/arquitetura/v1.md, 2.17. Existe porque `não lançado`, `parado` e
 * `trabalhado` são três coisas diferentes (decisão 4.2) e porque o fechamento
 * precisa de um lugar.
 *
 * **`não lançado` é AUSÊNCIA DE LINHA.** Nenhum processo cria dia por
 * antecipação; não existe "aba de dia", que é justamente o que gerou as 31
 * cópias da planilha. Consultar um dia sem linha devolve `null` e o RDO é
 * montado assim mesmo.
 */

import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { EstadoDoDia } from '../../shared/taxonomia';
import type { ObraId } from '../../shared/id';
import {
  checkDia,
  checkInstante,
  checkInstanteOpcional,
  colunaDia,
  colunaInstante,
  colunaInstanteOpcional,
} from './convencoes';
import { obra } from './obra';
import { colunaAutor, colunaAutorOpcional } from './usuario';

export const diaDeObra = sqliteTable(
  'dia_de_obra',
  {
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    data: colunaDia('data'),
    estado: text('estado').$type<EstadoDoDia>().notNull(),
    /**
     * Texto livre e obrigatório quando o dia é parado (decisão 20.1). Não
     * existe campo `complemento`: o texto livre já o absorve. As oito sugestões
     * preenchem o campo sem fechá-lo.
     */
    motivoParada: text('motivo_parada'),
    registradoPor: colunaAutor('registrado_por'),
    registradoEm: colunaInstante('registrado_em'),
    /** Correção em dia aberto. Depois de fechado, só retificação. */
    atualizadoPor: colunaAutorOpcional('atualizado_por'),
    atualizadoEm: colunaInstanteOpcional('atualizado_em'),
    /** Nulo = **dia aberto**. Fechar exige perfil engenheiro. */
    fechadoPor: colunaAutorOpcional('fechado_por'),
    fechadoEm: colunaInstanteOpcional('fechado_em'),
    /**
     * A EXCEÇÃO, dita em voz alta.
     *
     * É o único campo do sistema inteiro em que um valor derivado do RDO é
     * gravado. Existe por decisão 6.2 e por rastreabilidade contratual: o
     * número é o identificador do documento entregue ao fiscal, e mudar a data
     * de início da obra não pode renumerar o que já foi entregue.
     *
     * Escrito UMA vez, dentro da transação de `fechaDia`. Exatamente uma função
     * do sistema o lê: `calculaNumeroDoRdo`. Se aparecer um segundo campo
     * assim, é defeito, não precedente.
     */
    numeroRdoCongelado: integer('numero_rdo_congelado'),
  },
  (t) => [
    // PK natural, e não id sintético: é ela que faz a FK composta dos
    // lançamentos funcionar e torna "não lançado = ausência de linha"
    // verificável (arquitetura, decisão 12 da seção 7).
    primaryKey({ columns: [t.obraId, t.data] }),
    uniqueIndex('ux_dia_de_obra_estado').on(t.obraId, t.data, t.estado),
    checkDia('ck_dia_de_obra_data', t.data),
    // Decisão 4.2: são dois valores gravados; o terceiro estado é a ausência
    // de linha.
    check('ck_dia_de_obra_estado', sql`${t.estado} IN ('trabalhado', 'parado')`),
    // Decisões 4.1 e 20.1: dia parado tem motivo e zero atividades; dia
    // trabalhado não tem motivo. A planilha escrevia "Não houve atividades" em
    // 110 linhas, com status `Produção` e 61 delas sem motivo nenhum.
    check(
      'ck_dia_de_obra_motivo',
      sql`(${t.estado} = 'parado' AND ${t.motivoParada} IS NOT NULL AND length(trim(${t.motivoParada})) > 0)
       OR (${t.estado} = 'trabalhado' AND ${t.motivoParada} IS NULL)`,
    ),
    // Decisão 6.2: o número congela NO fechamento. O CHECK torna impossível
    // gravá-lo com o dia aberto, e impossível fechar sem ele.
    check(
      'ck_dia_de_obra_fechamento',
      sql`(${t.fechadoEm} IS NULL AND ${t.fechadoPor} IS NULL AND ${t.numeroRdoCongelado} IS NULL)
       OR (${t.fechadoEm} IS NOT NULL AND ${t.fechadoPor} IS NOT NULL AND ${t.numeroRdoCongelado} IS NOT NULL)`,
    ),
    // Decisão 6.1: o primeiro dia do contrato é o RDO 0. Decisão 23.1: dia fora
    // do período da obra não gera documento, "evita RDO de número negativo".
    check(
      'ck_dia_de_obra_numero_rdo',
      sql`${t.numeroRdoCongelado} IS NULL OR ${t.numeroRdoCongelado} >= 0`,
    ),
    checkInstante('ck_dia_de_obra_registrado_em', t.registradoEm),
    checkInstanteOpcional('ck_dia_de_obra_atualizado_em', t.atualizadoEm),
    checkInstanteOpcional('ck_dia_de_obra_fechado_em', t.fechadoEm),
  ],
);
