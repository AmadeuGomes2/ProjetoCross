/**
 * Acesso ao banco do módulo `acesso`.
 *
 * Lê e escreve **só** as tabelas que este módulo possui: `usuario`, `acesso`,
 * `convite` e `sessao` (docs/arquitetura/v1.md, 4.1, item 4). A única leitura
 * fora dessa lista é `obra.contrato`, em `listaObrasDoUsuario`, e ela existe
 * porque a resposta da tela de escolha de obra precisa de um rótulo; está
 * marcada abaixo.
 */

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import { acesso, convite, obra, sessao, usuario } from '../../db/schema';
import type { Instante } from '../../shared/date/fuso';
import {
  idConfiavel,
  type AcessoId,
  type ConviteId,
  type ObraId,
  type SessaoId,
  type UsuarioId,
} from '../../shared/id';
import type { ObraResumo, Perfil } from './tipos';

export interface LinhaDeUsuario {
  readonly id: UsuarioId;
  readonly hashDeSenha: string | null;
}

/**
 * Esta conta é de engenheiro?
 *
 * Pergunta sobre a **pessoa**, e não sobre a relação dela com uma obra: quem
 * tem CREA e assina o RDO. É o que autoriza criar obra (decisão 25.1). O perfil
 * por obra continua em `buscaAcessoAtivo`, e uma coisa não implica a outra.
 */
export function eContaDeEngenheiro(db: BancoRdo, usuarioId: UsuarioId): boolean {
  const linha = db
    .select({ eEngenheiro: usuario.eEngenheiro })
    .from(usuario)
    .where(eq(usuario.id, usuarioId))
    .get();
  return linha?.eEngenheiro === 1;
}

/** E-mail é guardado normalizado em caixa baixa, para o UNIQUE valer de fato. */
export function normalizaEmail(bruto: string): string {
  return bruto.trim().toLocaleLowerCase('pt-BR');
}

export function buscaUsuarioPorEmail(db: BancoRdo, email: string): LinhaDeUsuario | null {
  const linha = db
    .select({ id: usuario.id, hashDeSenha: usuario.hashDeSenha })
    .from(usuario)
    .where(eq(usuario.email, normalizaEmail(email)))
    .get();
  return linha ?? null;
}

export function existeUsuario(db: BancoRdo, usuarioId: UsuarioId): boolean {
  return (
    db.select({ id: usuario.id }).from(usuario).where(eq(usuario.id, usuarioId)).get() !==
    undefined
  );
}

export function insereUsuario(
  db: BancoRdo,
  dados: {
    readonly id: UsuarioId;
    readonly nome: string;
    readonly email: string;
    readonly hashDeSenha: string | null;
    /**
     * Só o comando de instalação manda `true` aqui — o outro caminho que liga a
     * coluna é o aceite de convite de engenheiro (34.1), e ele usa
     * `marcaContaComoEngenheiro`, porque a conta já existe. Explícito, e não
     * opcional com padrão: quem escrever o próximo caminho de criação de conta
     * é obrigado a decidir, e a decisão fica escrita na chamada.
     */
    readonly eEngenheiro: boolean;
    readonly criadoEm: Instante;
  },
): void {
  db.insert(usuario)
    .values({
      id: dados.id,
      nome: dados.nome,
      email: normalizaEmail(dados.email),
      hashDeSenha: dados.hashDeSenha,
      eEngenheiro: dados.eEngenheiro ? 1 : 0,
      criadoEm: dados.criadoEm,
    })
    .run();
}

/**
 * Liga `usuario.e_engenheiro` de uma conta que já existe.
 *
 * **Segundo e último caminho que liga esta coluna** (decisão 34.1). O primeiro
 * é o comando `npm run criar-engenheiro`, que a grava no INSERT da conta
 * (`instalacao.ts`). Não há terceiro: quem acrescentar um está mudando quem
 * pode criar obra (25.1), e isso é decisão de produto.
 *
 * Idempotente: ligar o que já está ligado não muda nada. Não existe função para
 * desligar — tirar o acesso de alguém é revogar o acesso da obra, e desligar a
 * coluna de quem já assina RDO não tem decisão que a autorize.
 */
export function marcaContaComoEngenheiro(db: BancoRdo, usuarioId: UsuarioId): void {
  db.update(usuario).set({ eEngenheiro: 1 }).where(eq(usuario.id, usuarioId)).run();
}

export interface LinhaDeSessao {
  readonly id: SessaoId;
  readonly usuarioId: UsuarioId;
  readonly expiraEm: Instante;
  readonly revogadaEm: Instante | null;
}

export function insereSessao(
  db: BancoRdo,
  dados: {
    readonly id: SessaoId;
    readonly usuarioId: UsuarioId;
    readonly tokenHash: string;
    readonly criadoEm: Instante;
    readonly expiraEm: Instante;
  },
): void {
  db.insert(sessao)
    .values({ ...dados, revogadaEm: null })
    .run();
}

export function buscaSessaoPorHash(
  db: BancoRdo,
  tokenHash: string,
): LinhaDeSessao | null {
  const linha = db
    .select({
      id: sessao.id,
      usuarioId: sessao.usuarioId,
      expiraEm: sessao.expiraEm,
      revogadaEm: sessao.revogadaEm,
    })
    .from(sessao)
    .where(eq(sessao.tokenHash, tokenHash))
    .get();
  return linha ?? null;
}

export function revogaSessaoPorHash(db: BancoRdo, tokenHash: string, em: Instante): void {
  db.update(sessao)
    .set({ revogadaEm: em })
    .where(and(eq(sessao.tokenHash, tokenHash), isNull(sessao.revogadaEm)))
    .run();
}

export interface LinhaDeAcesso {
  readonly id: AcessoId;
  readonly obraId: ObraId;
  readonly usuarioId: UsuarioId;
  readonly perfil: Perfil;
}

/**
 * Acesso **ativo** do par usuário/obra.
 *
 * `revogado_em IS NULL` é a definição de ativo (2.4). Esta consulta roda em
 * toda requisição protegida, sem cache: revogar precisa valer já na próxima
 * requisição, e não no próximo login (CT-081).
 */
export function buscaAcessoAtivo(
  db: BancoRdo,
  usuarioId: UsuarioId,
  obraId: ObraId,
): LinhaDeAcesso | null {
  const linha = db
    .select({
      id: acesso.id,
      obraId: acesso.obraId,
      usuarioId: acesso.usuarioId,
      perfil: acesso.perfil,
    })
    .from(acesso)
    .where(
      and(
        eq(acesso.usuarioId, usuarioId),
        eq(acesso.obraId, obraId),
        isNull(acesso.revogadoEm),
      ),
    )
    .get();
  return linha ?? null;
}

export interface LinhaDeAcessoDaObra {
  readonly id: AcessoId;
  readonly usuarioId: UsuarioId;
  readonly perfil: Perfil;
  readonly liberadoEm: Instante;
}

/**
 * Quem tem acesso à obra, para a tela de revogação.
 *
 * **Sem nome e sem e-mail.** O engenheiro identifica o acesso pelo id; mostrar
 * dado pessoal de conta numa lista administrativa não é necessário para
 * revogar, e o que não sai não vaza (CLAUDE.md, Segurança). Ver relatório de
 * entrega: exibir o nome aqui precisa de decisão de quem responde pelo produto.
 */
export function listaAcessosDaObra(db: BancoRdo, obraId: ObraId): LinhaDeAcessoDaObra[] {
  return db
    .select({
      id: acesso.id,
      usuarioId: acesso.usuarioId,
      perfil: acesso.perfil,
      liberadoEm: acesso.liberadoEm,
    })
    .from(acesso)
    .where(and(eq(acesso.obraId, obraId), isNull(acesso.revogadoEm)))
    .orderBy(acesso.liberadoEm)
    .all();
}

export function buscaAcessoPorId(db: BancoRdo, acessoId: AcessoId): LinhaDeAcesso | null {
  const linha = db
    .select({
      id: acesso.id,
      obraId: acesso.obraId,
      usuarioId: acesso.usuarioId,
      perfil: acesso.perfil,
    })
    .from(acesso)
    .where(and(eq(acesso.id, acessoId), isNull(acesso.revogadoEm)))
    .get();
  return linha ?? null;
}

export function insereAcesso(
  db: BancoRdo,
  dados: {
    readonly id: AcessoId;
    readonly obraId: ObraId;
    readonly usuarioId: UsuarioId;
    readonly perfil: Perfil;
    readonly liberadoPor: UsuarioId;
    readonly liberadoEm: Instante;
  },
): void {
  db.insert(acesso)
    .values({ ...dados, revogadoPor: null, revogadoEm: null })
    .run();
}

/** Revogação **não apaga a linha** (2.4): o histórico de quem teve acesso fica. */
export function marcaAcessoRevogado(
  db: BancoRdo,
  acessoId: AcessoId,
  por: UsuarioId,
  em: Instante,
): void {
  db.update(acesso)
    .set({ revogadoPor: por, revogadoEm: em })
    .where(and(eq(acesso.id, acessoId), isNull(acesso.revogadoEm)))
    .run();
}

export interface LinhaDeConvite {
  readonly id: ConviteId;
  readonly obraId: ObraId;
  /**
   * O perfil que este convite concede (34.1). Quem manda é a **linha**, nunca
   * o que o aceitante pede: o perfil foi escolhido por quem convidou, e é
   * gravado no momento em que o link nasce.
   */
  readonly perfil: Perfil;
  /** Quem gerou o link. É quem "liberou" o acesso do convidado (CT-073). */
  readonly criadoPor: UsuarioId;
  readonly expiraEm: Instante;
  readonly usadoEm: Instante | null;
}

export function insereConvite(
  db: BancoRdo,
  dados: {
    readonly id: ConviteId;
    readonly obraId: ObraId;
    readonly tokenHash: string;
    readonly perfil: Perfil;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
    readonly expiraEm: Instante;
  },
): void {
  db.insert(convite)
    .values({ ...dados, usadoPor: null, usadoEm: null })
    .run();
}

export function buscaConvitePorHash(
  db: BancoRdo,
  tokenHash: string,
): LinhaDeConvite | null {
  const linha = db
    .select({
      id: convite.id,
      obraId: convite.obraId,
      perfil: convite.perfil,
      criadoPor: convite.criadoPor,
      expiraEm: convite.expiraEm,
      usadoEm: convite.usadoEm,
    })
    .from(convite)
    .where(eq(convite.tokenHash, tokenHash))
    .get();
  return linha ?? null;
}

/**
 * Marca o convite como usado **só se ainda não estiver**.
 *
 * O `WHERE usado_em IS NULL` é o que faz o uso único valer mesmo com dois
 * aceites simultâneos: o segundo `UPDATE` afeta zero linhas, e quem chama
 * desfaz a transação. Conferir com um `SELECT` antes não bastaria.
 */
export function marcaConviteUsado(
  db: BancoRdo,
  conviteId: ConviteId,
  por: UsuarioId,
  em: Instante,
): number {
  const resultado = db
    .update(convite)
    .set({ usadoPor: por, usadoEm: em })
    .where(and(eq(convite.id, conviteId), isNull(convite.usadoEm)))
    .run();
  return resultado.changes;
}

/**
 * Obras que o usuário pode ver.
 *
 * Junta `obra` só para trazer o contrato, que é o rótulo da tela de escolha.
 * Nenhum outro campo de obra sai daqui, e nome de pessoa nenhum.
 */
export function listaObrasComAcesso(db: BancoRdo, usuarioId: UsuarioId): ObraResumo[] {
  return db
    .select({ obraId: obra.id, contrato: obra.contrato, perfil: acesso.perfil })
    .from(acesso)
    .innerJoin(obra, eq(obra.id, acesso.obraId))
    .where(and(eq(acesso.usuarioId, usuarioId), isNull(acesso.revogadoEm)))
    .orderBy(obra.contrato)
    .all();
}

/**
 * O sistema já tem conta de engenheiro?
 *
 * Pergunta do **comando de instalação**, que existe para a primeira delas.
 * Note que não há consulta equivalente na autorização: lá a pergunta é sempre
 * sobre uma conta, nunca sobre o estado global do sistema. Uma regra que lê
 * "ainda não existe nenhum" reabre sozinha quando alguém apaga o último.
 */
export function existeContaDeEngenheiro(db: BancoRdo): boolean {
  return (
    db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.eEngenheiro, 1))
      .limit(1)
      .get() !== undefined
  );
}

/**
 * Existe alguma conta com senha cadastrada?
 *
 * Usado só pelo comando de instalação, para decidir se aquele sistema ainda é
 * virgem. Conta com senha só nasce por este comando ou por aceite de convite —
 * e convite exige obra, que exige engenheiro. Perguntar as duas coisas
 * (`existeContaDeEngenheiro` e esta) fecha a janela em que duas contas de
 * instalação nasceriam sem que ninguém percebesse.
 */
export function existeContaComSenha(db: BancoRdo): boolean {
  return (
    db
      .select({ id: usuario.id })
      .from(usuario)
      .where(isNotNull(usuario.hashDeSenha))
      .limit(1)
      .get() !== undefined
  );
}

export function contaEngenheirosAtivos(db: BancoRdo, obraId: ObraId): number {
  const linha = db
    .select({ total: sql<number>`count(*)` })
    .from(acesso)
    .where(
      and(
        eq(acesso.obraId, obraId),
        eq(acesso.perfil, 'engenheiro'),
        isNull(acesso.revogadoEm),
      ),
    )
    .get();
  return linha?.total ?? 0;
}

export function idDeAcesso(valor: string): AcessoId {
  return idConfiavel<'acesso'>(valor);
}
