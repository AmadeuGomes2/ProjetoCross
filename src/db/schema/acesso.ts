/**
 * `acesso`, `convite` e `sessao` — a fronteira de confiança entre perfis.
 *
 * docs/arquitetura/v1.md, 2.4 a 2.6. O perfil não é do usuário: é da relação
 * dele com a obra (14.0). Por isso `acesso` tem obra, usuário e perfil juntos,
 * e a autorização lê esta tabela **em toda requisição**, sem guardar perfil em
 * sessão nem em cookie.
 *
 * Token de convite e de sessão são guardados em **hash** (decisão 17 da seção
 * 7): vazamento de banco não pode virar vazamento de acesso.
 */

import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import type { AcessoId, ConviteId, ObraId, SessaoId, UsuarioId } from '../../shared/id';
import {
  checkInstante,
  checkInstanteOpcional,
  colunaInstante,
  colunaInstanteOpcional,
} from './convencoes';
import { obra } from './obra';
import { colunaAutor, colunaAutorOpcional, usuario } from './usuario';

export type Perfil = 'engenheiro' | 'encarregado';

export const acesso = pgTable(
  'acesso',
  {
    id: text('id').$type<AcessoId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    usuarioId: text('usuario_id')
      .$type<UsuarioId>()
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    perfil: text('perfil').$type<Perfil>().notNull(),
    liberadoPor: colunaAutor('liberado_por'),
    liberadoEm: colunaInstante('liberado_em'),
    /** Revogação **não apaga a linha**: o histórico de quem teve acesso fica. */
    revogadoPor: colunaAutorOpcional('revogado_por'),
    revogadoEm: colunaInstanteOpcional('revogado_em'),
  },
  (t) => [
    // Um acesso ATIVO por par obra/usuário. O parcial é o que permite a mesma
    // pessoa ser readmitida depois de revogada sem apagar a linha antiga.
    uniqueIndex('ux_acesso_ativo')
      .on(t.obraId, t.usuarioId)
      .where(sql`${t.revogadoEm} IS NULL`),
    index('idx_acesso_usuario')
      .on(t.usuarioId)
      .where(sql`${t.revogadoEm} IS NULL`),
    check('ck_acesso_perfil', sql`${t.perfil} IN ('engenheiro', 'encarregado')`),
    checkInstante('ck_acesso_liberado_em', t.liberadoEm),
    checkInstanteOpcional('ck_acesso_revogado_em', t.revogadoEm),
  ],
);

export const convite = pgTable(
  'convite',
  {
    id: text('id').$type<ConviteId>().primaryKey(),
    obraId: text('obra_id')
      .$type<ObraId>()
      .notNull()
      .references(() => obra.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    /** SHA-256 do token. O token em claro não é gravado em lugar nenhum. */
    tokenHash: text('token_hash').notNull(),
    /**
     * Perfil que o convite concede na obra.
     *
     * Decisão 34.1, de 16/09/2026: **um engenheiro dá acesso de engenheiro a
     * outra pessoa na obra.** Antes disto a coluna era fixa em `encarregado`, e
     * a consequência era que a saída do engenheiro travava o cadastro da obra —
     * só o comando no servidor criava outro (25.1).
     */
    perfil: text('perfil').$type<Perfil>().notNull(),
    criadoPor: colunaAutor('criado_por'),
    criadoEm: colunaInstante('criado_em'),
    /** `criado_em` + 7 dias, calculado no servidor (14.0). */
    expiraEm: colunaInstante('expira_em'),
    usadoPor: colunaAutorOpcional('usado_por'),
    /** Nulo = ainda não usado. Uso único. */
    usadoEm: colunaInstanteOpcional('usado_em'),
  },
  (t) => [
    uniqueIndex('ux_convite_token').on(t.tokenHash),
    // Os dois perfis entram por link (34.1). O CHECK continua fechado na lista:
    // o perfil chega do formulário, e o banco é a segunda camada que impede uma
    // rota nova de inventar um terceiro.
    check('ck_convite_perfil', sql`${t.perfil} IN ('engenheiro', 'encarregado')`),
    checkInstante('ck_convite_criado_em', t.criadoEm),
    checkInstante('ck_convite_expira_em', t.expiraEm),
    checkInstanteOpcional('ck_convite_usado_em', t.usadoEm),
  ],
);

export const sessao = pgTable(
  'sessao',
  {
    id: text('id').$type<SessaoId>().primaryKey(),
    usuarioId: text('usuario_id')
      .$type<UsuarioId>()
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    /** SHA-256 do valor do cookie, que é opaco e sem nome de pessoa. */
    tokenHash: text('token_hash').notNull(),
    criadoEm: colunaInstante('criado_em'),
    expiraEm: colunaInstante('expira_em'),
    revogadaEm: colunaInstanteOpcional('revogada_em'),
  },
  (t) => [
    uniqueIndex('ux_sessao_token').on(t.tokenHash),
    index('idx_sessao_usuario').on(t.usuarioId),
    checkInstante('ck_sessao_criado_em', t.criadoEm),
    checkInstante('ck_sessao_expira_em', t.expiraEm),
    checkInstanteOpcional('ck_sessao_revogada_em', t.revogadaEm),
  ],
);
