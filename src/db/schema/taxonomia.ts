/**
 * `funcao`, `tipo_equipamento`, `status_atividade` e `sugestao_motivo_parada`.
 *
 * docs/arquitetura/v1.md, 2.7 a 2.10. Taxonomia é **tabela de domínio
 * editável**, nunca constante no código (R13): a validação da planilha legada
 * já reservava duas linhas vazias para termos novos.
 *
 * Escopo é de SISTEMA, não de obra (19.2). Por isso **não têm `obra_id`**, e é
 * a única família de tabelas do esquema sem ele.
 *
 * `termo` guarda a grafia exata herdada, erros de ortografia inclusive, porque
 * é o vocabulário que o fiscal reconhece. `termo_normalizado` é a chave de
 * comparação, produzida por `shared/taxonomia`, e é ela que faz
 * `" perca de Produção "` colidir com `"Perca de produção"` no banco e não só
 * no código (caso de teste obrigatório 13).
 */

import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import type {
  FuncaoId,
  StatusAtividadeId,
  SugestaoMotivoId,
  TipoEquipamentoId,
} from '../../shared/id';
import {
  checkBooleano,
  checkInstante,
  checkTextoNaoVazio,
  colunaBooleano,
  colunaInstante,
  colunaOrdem,
} from './convencoes';

/**
 * As três taxonomias têm exatamente a mesma forma. Escrever a forma uma vez
 * evita que uma delas ganhe um CHECK a menos numa migration futura.
 *
 * São tabelas separadas, e não uma tabela única com coluna `tipo`, porque com
 * FK simples é impossível apontar um status onde se espera uma função
 * (arquitetura, decisão 6 da seção 7).
 */
function tabelaDeTaxonomia<T extends string>(nomeDaTabela: string, prefixo: string) {
  return pgTable(
    nomeDaTabela,
    {
      id: text('id').$type<T>().primaryKey(),
      /** Grafia exata para exibir. Nunca use para comparar. */
      termo: text('termo').notNull(),
      /** Chave de comparação. Nunca use para exibir. */
      termoNormalizado: text('termo_normalizado').notNull(),
      ordem: colunaOrdem('ordem'),
      /** Termo sai de uso sem sumir do histórico: desativa, não apaga. */
      ativo: colunaBooleano('ativo').default(1),
      criadoEm: colunaInstante('criado_em'),
    },
    (t) => [
      uniqueIndex(`ux_${prefixo}_normalizado`).on(t.termoNormalizado),
      checkTextoNaoVazio(`ck_${prefixo}_termo`, t.termo),
      checkTextoNaoVazio(`ck_${prefixo}_normalizado`, t.termoNormalizado),
      checkBooleano(`ck_${prefixo}_ativo`, t.ativo),
      checkInstante(`ck_${prefixo}_criado_em`, t.criadoEm),
    ],
  );
}

/** Carga inicial: 12 funções observadas no cadastro real (19.1). */
export const funcao = tabelaDeTaxonomia<FuncaoId>('funcao', 'funcao');

/** Carga inicial: 8 tipos. Não aparecem no RDO; o bloco 6 usa o identificador. */
export const tipoEquipamento = tabelaDeTaxonomia<TipoEquipamentoId>(
  'tipo_equipamento',
  'tipo_equipamento',
);

/** Carga inicial: os 14 status de `DADOS!G3:G16`, só 8 já usados na planilha. */
export const statusAtividade = tabelaDeTaxonomia<StatusAtividadeId>(
  'status_atividade',
  'status_atividade',
);

/**
 * As 8 sugestões tocáveis de motivo de dia parado.
 *
 * O motivo é **texto livre obrigatório** (20.1); esta tabela só preenche o
 * campo sem fechá-lo. **Nenhuma chave estrangeira aponta para cá**, de
 * propósito: validar o motivo contra esta lista seria transformá-la em
 * taxonomia fechada, que a decisão 20.1 recusou.
 *
 * `condicao_tempo` não existe, em nenhuma forma (2.1).
 */
export const sugestaoMotivoParada = pgTable(
  'sugestao_motivo_parada',
  {
    id: text('id').$type<SugestaoMotivoId>().primaryKey(),
    texto: text('texto').notNull(),
    textoNormalizado: text('texto_normalizado').notNull(),
    ordem: colunaOrdem('ordem'),
    ativo: colunaBooleano('ativo').default(1),
  },
  (t) => [
    uniqueIndex('ux_sugestao_motivo_normalizado').on(t.textoNormalizado),
    checkTextoNaoVazio('ck_sugestao_motivo_texto', t.texto),
    checkTextoNaoVazio('ck_sugestao_motivo_normalizado', t.textoNormalizado),
    checkBooleano('ck_sugestao_motivo_ativo', t.ativo),
  ],
);
