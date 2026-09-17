/**
 * `usuario` — quem lança e quem responde.
 *
 * docs/arquitetura/v1.md, 2.3. Existe porque todo lançamento tem autor (R16).
 * **É o `id` desta tabela que vai para o log e para a autoria, nunca o nome.**
 * CLAUDE.md, Segurança: "Identifique por id, não por nome."
 */

import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import type { UsuarioId } from '../../shared/id';
import {
  checkBooleano,
  checkInstante,
  checkTextoNaoVazio,
  colunaBooleano,
  colunaInstante,
} from './convencoes';

export const usuario = pgTable(
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
    /**
     * Esta conta é de engenheiro?
     *
     * **Atributo da pessoa, não da obra.** Engenheiro é quem tem CREA e assina
     * o documento — o bloco 11 do RDO imprime nome, titulação e registro —,
     * enquanto `acesso.perfil` diz o que a pessoa pode fazer *naquela* obra. Só
     * quem tem esta coluna ligada cria obra (decisão 25.1).
     *
     * **Dois caminhos ligam esta coluna, e são só estes dois:**
     *
     * 1. o comando `npm run criar-engenheiro`, que cria a primeira conta fora
     *    da web (25.1, `modules/acesso/instalacao.ts`);
     * 2. o **aceite de convite de engenheiro** (34.1,
     *    `modules/acesso/convite.ts`), na mesma transação do acesso.
     *
     * Não há cadastro público, e convite de **encarregado** não liga nada.
     * Quem acrescentar um terceiro caminho está mudando quem pode criar obra,
     * e isso é decisão de produto, não efeito colateral.
     *
     * O padrão é falso de propósito: a conta que nasce por engano nasce sem
     * poder nenhum.
     */
    eEngenheiro: colunaBooleano('e_engenheiro').default(0),
    criadoEm: colunaInstante('criado_em'),
  },
  (t) => [
    uniqueIndex('ux_usuario_email').on(t.email),
    checkTextoNaoVazio('ck_usuario_nome', t.nome),
    checkTextoNaoVazio('ck_usuario_email', t.email),
    checkBooleano('ck_usuario_e_engenheiro', t.eEngenheiro),
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
