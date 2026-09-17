/**
 * `servico_controlado` e `quantidade_projeto_versao` — o bloco 7 do RDO.
 *
 * docs/arquitetura/v1.md, 2.15 e 2.16. O serviço existe porque produção casa
 * por **referência ao cadastro**, nunca por igualdade de texto (R5): renomear o
 * serviço não pode zerar o acumulado, que é o que acontecia na planilha.
 *
 * A quantidade de projeto é **versionada** e **não tem cópia no serviço**
 * (R15). Duas colunas com o mesmo número são duas verdades, e é assim que o
 * percentual começa a divergir.
 */

import { desc } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import type {
  ObraId,
  QuantidadeProjetoVersaoId,
  ServicoControladoId,
} from '../../shared/id';
import {
  checkBooleano,
  checkInstante,
  checkMilesimosPositivo,
  checkTextoNaoVazio,
  colunaBooleano,
  colunaInstante,
  colunaMilesimos,
  colunaOrdem,
} from './convencoes';
import { obra } from './obra';
import { colunaAutor } from './usuario';

export const servicoControlado = pgTable(
  'servico_controlado',
  {
    id: text('id').$type<ServicoControladoId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    /** Grafia exata: `REC.(FRESA+CAPA)`. Exibida como está. */
    nome: text('nome').notNull(),
    nomeNormalizado: text('nome_normalizado').notNull(),
    /** Posição fixa no bloco 7, que sempre mostra as quatro linhas. */
    ordem: colunaOrdem('ordem'),
    ativo: colunaBooleano('ativo').default(1),
  },
  (t) => [
    uniqueIndex('ux_servico_nome').on(t.obraId, t.nomeNormalizado),
    uniqueIndex('ux_servico_ordem').on(t.obraId, t.ordem),
    // Alvo das FK compostas de `quantidade_projeto_versao` e de
    // `lancamento_producao`: nenhuma produção aponta para serviço de outra obra.
    // Restrição de tabela, e não índice: o Postgres exige que o alvo da chave
    // estrangeira composta exista quando o `ALTER TABLE` roda, e o gerador
    // escreve os índices DEPOIS dos ALTERs.
    unique('ux_servico_id_obra').on(t.id, t.obraId),
    checkTextoNaoVazio('ck_servico_nome', t.nome),
    checkTextoNaoVazio('ck_servico_normalizado', t.nomeNormalizado),
    checkBooleano('ck_servico_ativo', t.ativo),
  ],
);

export const quantidadeProjetoVersao = pgTable(
  'quantidade_projeto_versao',
  {
    id: text('id').$type<QuantidadeProjetoVersaoId>().primaryKey(),
    obraId: text('obra_id').$type<ObraId>().notNull(),
    servicoId: text('servico_id').$type<ServicoControladoId>().notNull(),
    /** Decisão 13.4: maior que zero. Projeto zerado dividiria o percentual por 0. */
    quantidadeMilesimos: colunaMilesimos('quantidade_milesimos'),
    definidoPor: colunaAutor('definido_por'),
    definidoEm: colunaInstante('definido_em'),
  },
  (t) => [
    foreignKey({
      columns: [t.servicoId, t.obraId],
      foreignColumns: [servicoControlado.id, servicoControlado.obraId],
      name: 'fk_quantidade_projeto_servico',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    // A vigente é a ÚLTIMA versão por `definido_em`. Não há vigência temporal:
    // a alteração passa a valer para o percentual de qualquer RDO.
    index('idx_qtd_projeto_atual').on(t.servicoId, desc(t.definidoEm)),
    checkMilesimosPositivo('ck_quantidade_projeto_positiva', t.quantidadeMilesimos),
    checkInstante('ck_quantidade_projeto_definido_em', t.definidoEm),
  ],
);
