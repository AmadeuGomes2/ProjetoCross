/**
 * `obra` e `periodo_bms` — o cabeçalho do documento e o campo `BM'S`.
 *
 * docs/arquitetura/v1.md, 2.1 e 2.2. A `obra` existe porque os blocos 3, 4 e 11
 * do RDO saem daqui e porque `data_inicio` é o zero do número do RDO (R4,
 * decisão 6.1). O `periodo_bms` existe porque o BMS deixou de ser tabela fixa
 * legada e virou cadastro do engenheiro (7.1), obrigatório na criação da obra
 * (21.1).
 */

import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import type { ObraId, PeriodoBmsId } from '../../shared/id';
import {
  checkInstante,
  checkTextoNaoVazio,
  colunaDia,
  colunaInstante,
} from './convencoes';
import { colunaAutor } from './usuario';

/**
 * `BYTEA` do Postgres, para os bytes da logo.
 *
 * O Drizzle não traz um tipo binário pronto no `pg-core`, então ele é declarado
 * aqui, uma vez. O valor entra e sai como `Buffer`, que é o que `@react-pdf` e
 * o `Response` do Next consomem sem conversão.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const obra = pgTable(
  'obra',
  {
    id: text('id').$type<ObraId>().primaryKey(),
    /** Um campo só, não repartido em número e bloco (decisão 8.1). */
    contrato: text('contrato').notNull(),
    contratante: text('contratante').notNull(),
    contratada: text('contratada').notNull(),
    dataInicio: colunaDia('data_inicio'),
    dataTermino: colunaDia('data_termino'),
    escopo: text('escopo').notNull(),
    nomeProjeto: text('nome_projeto').notNull(),
    area: text('area').notNull(),
    local: text('local').notNull(),
    /**
     * Responsável técnico: nome, titulação e CREA moram na obra (decisão 18.1).
     * **Dado pessoal.** Opcional no cadastro e exigido na exportação
     * (arquitetura, pergunta P7), por isso as três colunas aceitam nulo.
     */
    respTecnicoNome: text('resp_tecnico_nome'),
    respTecnicoTitulo: text('resp_tecnico_titulo'),
    respTecnicoCrea: text('resp_tecnico_crea'),
    /**
     * A logo da contratada, que sai no cabeçalho do RDO (17/09/2026).
     *
     * **Guardada no banco, e não em arquivo.** A Vercel não tem disco
     * persistente: um arquivo salvo numa invocação não existe na seguinte. Como
     * bytes na própria linha da obra, a logo acompanha o backup e não exige
     * segundo serviço, segunda chave nem segunda fronteira de vazamento.
     *
     * O teto de tamanho é da borda, não do banco: `CHECK` sobre `length()` de
     * `bytea` funcionaria, mas devolveria violação de restrição onde o usuário
     * precisa de uma frase dizendo para diminuir a imagem.
     *
     * As duas colunas andam juntas — `CHECK` abaixo. Bytes sem tipo não sabem
     * como ser servidos, e tipo sem bytes é promessa vazia no cabeçalho.
     */
    logo: bytea('logo'),
    logoTipo: text('logo_tipo'),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    /*
     * As duas colunas andam juntas, e o tipo é um dos dois que o PDF desenha.
     *
     * `image/webp` saiu em 17/09/2026, na mesma passagem em que saiu da borda:
     * `@react-pdf/image` não sabe desenhá-lo, e o renderizador engole o erro em
     * silêncio — o PDF saía sem a marca enquanto a tela a mostrava. O `CHECK`
     * acompanha a regra para que uma escrita futura por outro caminho não
     * consiga gravar o que o documento não imprime.
     *
     * ## `IS NOT NULL` explícito, e não só o `IN`
     *
     * A primeira versão terminava em `logo_tipo IN ('image/png', 'image/jpeg')`
     * e **não barrava bytes sem tipo**. É a lógica de três valores do SQL:
     * `NULL IN (...)` é `NULL`, `true AND NULL` é `NULL`, e `CHECK` só recusa
     * quando o resultado é `false` — nulo passa. A restrição existia e não
     * restringia, que é pior que não existir, porque dá confiança falsa.
     *
     * Quem encontrou foi o teste desta restrição, escrito depois dela.
     */
    check(
      'ck_obra_logo',
      sql`(${t.logo} IS NULL AND ${t.logoTipo} IS NULL)
         OR (${t.logo} IS NOT NULL AND ${t.logoTipo} IS NOT NULL
             AND ${t.logoTipo} IN ('image/png', 'image/jpeg'))`,
    ),
    checkTextoNaoVazio('ck_obra_contrato', t.contrato),
    checkTextoNaoVazio('ck_obra_contratante', t.contratante),
    checkTextoNaoVazio('ck_obra_contratada', t.contratada),
    checkTextoNaoVazio('ck_obra_escopo', t.escopo),
    checkTextoNaoVazio('ck_obra_nome_projeto', t.nomeProjeto),
    checkTextoNaoVazio('ck_obra_area', t.area),
    checkTextoNaoVazio('ck_obra_local', t.local),
    // R14: a planilha tem um período de -716 dias. Caso de teste obrigatório 9.
    // A mensagem em português fica na borda; este CHECK é a rede.
    check('ck_obra_termino_apos_inicio', sql`${t.dataTermino} >= ${t.dataInicio}`),
    checkInstante('ck_obra_criado_em', t.criadoEm),
  ],
);

export const periodoBms = pgTable(
  'periodo_bms',
  {
    id: text('id').$type<PeriodoBmsId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    numero: integer('numero').notNull(),
    dataInicial: colunaDia('data_inicial'),
    dataFinal: colunaDia('data_final'),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    uniqueIndex('ux_periodo_bms_numero').on(t.obraId, t.numero),
    // Consulta do cabeçalho: qual período cobre este dia.
    index('idx_periodo_bms_busca').on(t.obraId, t.dataInicial, t.dataFinal),
    check('ck_periodo_bms_numero', sql`${t.numero} >= 0`),
    // R14 e R25, a mesma validação da obra.
    check('ck_periodo_bms_final_apos_inicial', sql`${t.dataFinal} >= ${t.dataInicial}`),
    checkInstante('ck_periodo_bms_criado_em', t.criadoEm),
  ],
);

// Sobreposição entre períodos da mesma obra NÃO é expressável em CHECK. Fica no
// caso de uso `cadastraPeriodoBms`, com consulta na mesma transação
// (arquitetura, decisão 11 e pergunta P5).
