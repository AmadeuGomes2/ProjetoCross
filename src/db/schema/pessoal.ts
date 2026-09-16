/**
 * `pessoa` e `passagem_pessoa` — o cadastro nominal e o efetivo.
 *
 * docs/arquitetura/v1.md, 2.11 e 2.12. **`pessoa` é a tabela mais sensível do
 * sistema** (LGPD): o RDO agrega por função e nunca mostra nome.
 *
 * `passagem_pessoa` existe porque uma pessoa pode sair e voltar. Intervalo
 * único na pessoa contaria duas linhas como duas pessoas (R3, caso de teste
 * obrigatório 8). O efetivo conta `COUNT(DISTINCT pessoa_id)`.
 *
 * **A função mora na passagem, não na pessoa** (decisão 29.1, de 16/09/2026).
 * Ver a migration `0002_funcao_na_passagem.sql`.
 */

import {
  foreignKey,
  index,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { FuncaoId, ObraId, PassagemPessoaId, PessoaId } from '../../shared/id';
import {
  checkDia,
  checkDiaOpcional,
  checkInstante,
  checkSaidaNaoAntesDaEntrada,
  checkTextoNaoVazio,
  colunaDia,
  colunaDiaOpcional,
  colunaInstante,
} from './convencoes';
import { obra } from './obra';
import { funcao } from './taxonomia';
import { colunaAutor } from './usuario';

export const pessoa = sqliteTable(
  'pessoa',
  {
    id: text('id').$type<PessoaId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    /** **Dado pessoal.** Só o engenheiro da obra lê. Nunca sai no RDO. */
    nome: text('nome').notNull(),
    // Sem `funcao_id`: decisão 29.1. A função é atributo da PASSAGEM. Com ela
    // aqui, promover o Motorista a Operador II em setembro reescrevia o efetivo
    // de março, e o RDO que o fiscal já recebeu mudava sozinho.
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    index('idx_pessoa_obra').on(t.obraId),
    // Existe só para ser o alvo da FK composta de `passagem_pessoa`. Não há
    // UNIQUE (obra_id, nome): dois homônimos na mesma obra são possíveis e
    // rejeitar isso seria regra inventada.
    uniqueIndex('ux_pessoa_id_obra').on(t.id, t.obraId),
    checkTextoNaoVazio('ck_pessoa_nome', t.nome),
    checkInstante('ck_pessoa_criado_em', t.criadoEm),
  ],
);

export const passagemPessoa = sqliteTable(
  'passagem_pessoa',
  {
    id: text('id').$type<PassagemPessoaId>().primaryKey(),
    /** Denormalizado de propósito: o filtro de autorização é sempre o mesmo. */
    obraId: text('obra_id').$type<ObraId>().notNull(),
    pessoaId: text('pessoa_id').$type<PessoaId>().notNull(),
    /**
     * A função **desta passagem** (decisão 29.1). Referência ao cadastro,
     * nunca texto solto (R2, R13): a planilha tinha `Servente ` com espaço no
     * fim e o Excel deixava passar.
     *
     * Trocar de função encerra a passagem e abre outra, então o efetivo de um
     * dia passado continua dizendo o que era verdade naquele dia.
     */
    funcaoId: text('funcao_id')
      .$type<FuncaoId>()
      .notNull()
      .references(() => funcao.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    entrada: colunaDia('entrada'),
    /** Nulo = ainda na obra. */
    saida: colunaDiaOpcional('saida'),
    registradoPor: colunaAutor('registrado_por'),
    registradoEm: colunaInstante('registrado_em'),
  },
  (t) => [
    // A FK composta é o que impede uma passagem apontar para pessoa de OUTRA
    // obra: a redundância de `obra_id` fica travada, não solta.
    foreignKey({
      columns: [t.pessoaId, t.obraId],
      foreignColumns: [pessoa.id, pessoa.obraId],
      name: 'fk_passagem_pessoa_pessoa',
    })
      .onDelete('restrict')
      .onUpdate('restrict'),
    // R1 e decisão 1.1: conta no dia D quem tem
    // entrada <= D AND (saida IS NULL OR saida >= D). A comparação
    // lexicográfica de AAAA-MM-DD é a cronológica, então o índice serve direto.
    index('idx_passagem_pessoa_dia').on(t.obraId, t.entrada, t.saida),
    index('idx_passagem_pessoa_pessoa').on(t.pessoaId),
    index('idx_passagem_pessoa_funcao').on(t.funcaoId),
    checkDia('ck_passagem_pessoa_entrada', t.entrada),
    checkDiaOpcional('ck_passagem_pessoa_saida', t.saida),
    checkSaidaNaoAntesDaEntrada('ck_passagem_pessoa_intervalo', t.saida, t.entrada),
    checkInstante('ck_passagem_pessoa_registrado_em', t.registradoEm),
  ],
);

// Sobreposição de duas passagens da MESMA pessoa não é expressável em CHECK;
// fica no caso de uso `registraPassagem` (arquitetura, pergunta P4). O
// COUNT(DISTINCT pessoa_id) protege o número de qualquer jeito.
