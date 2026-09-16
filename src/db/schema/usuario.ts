/**
 * `usuario` — quem lança e quem responde.
 *
 * docs/arquitetura/v1.md, 2.3. Existe porque todo lançamento tem autor (R16).
 * **É o `id` desta tabela que vai para o log e para a autoria, nunca o nome.**
 * CLAUDE.md, Segurança: "Identifique por id, não por nome."
 */

import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { UsuarioId } from '../../shared/id';
import { checkInstante, checkTextoNaoVazio, colunaInstante } from './convencoes';

export const usuario = sqliteTable(
  'usuario',
  {
    id: text('id').$type<UsuarioId>().primaryKey(),
    /** Dado pessoal (LGPD). Não sai em log, em erro, em URL nem em PDF. */
    nome: text('nome').notNull(),
    /** Dado pessoal. Guardado normalizado em caixa baixa, para o UNIQUE valer. */
    email: text('email').notNull(),
    /**
     * Nulo enquanto o mecanismo de autenticação do engenheiro não é decidido
     * (arquitetura, pergunta P1). Nunca guarda senha, só o hash.
     */
    hashDeSenha: text('hash_de_senha'),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    uniqueIndex('ux_usuario_email').on(t.email),
    checkTextoNaoVazio('ck_usuario_nome', t.nome),
    checkTextoNaoVazio('ck_usuario_email', t.email),
    checkInstante('ck_usuario_criado_em', t.criadoEm),
  ],
);

/**
 * Coluna de autoria: `*_por TEXT NOT NULL REFERENCES usuario(id)`.
 *
 * Arquitetura, seção 1: guarda-se **id**, nunca nome. Escrever a coluna de
 * autoria por esta função é o que impede alguém tipar `text('criado_por')` e
 * gravar um nome ali.
 *
 * RESTRICT nas duas pontas: apagar usuário que já lançou apagaria a autoria de
 * um RDO entregue ao fiscal.
 */
export const colunaAutor = (nome: string) =>
  text(nome)
    .$type<UsuarioId>()
    .notNull()
    .references(() => usuario.id, { onDelete: 'restrict', onUpdate: 'restrict' });

/** Autoria opcional: correção em dia aberto, revogação, uso de convite. */
export const colunaAutorOpcional = (nome: string) =>
  text(nome)
    .$type<UsuarioId>()
    .references(() => usuario.id, { onDelete: 'restrict', onUpdate: 'restrict' });
