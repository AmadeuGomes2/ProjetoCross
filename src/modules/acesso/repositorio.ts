/**
 * Acesso ao banco do módulo `acesso`.
 *
 * Lê e escreve **só** as tabelas que este módulo possui: `usuario`, `acesso`,
 * `convite` e `sessao` (docs/arquitetura/v1.md, 4.1, item 4). A única leitura
 * fora dessa lista é `obra.contrato`, em `listaObrasDoUsuario`, e ela existe
 * porque a resposta da tela de escolha de obra precisa de um rótulo; está
 * marcada abaixo.
 *
 * ## Assíncrono desde 17/09/2026
 *
 * O banco deixou de ser SQLite em arquivo e passou a ser Postgres, no Neon
 * (ver `src/db/index.ts`). O driver antigo era **síncrono**; o de Postgres
 * devolve `Promise`, e por isso toda função daqui virou `async`. Nenhuma regra
 * mudou junto — é conversão de forma.
 *
 * Duas consequências de forma que valem registro, porque o dialeto novo não
 * tem os atalhos do antigo:
 *
 * - **não existe `.get()`** no `drizzle-orm/pg-core`. Leitura de uma linha só
 *   é `.limit(1)` mais o primeiro elemento, que com `noUncheckedIndexedAccess`
 *   já nasce `T | undefined` e obriga a tratar o vazio;
 * - **não existe `.run()` nem `resultado.changes`**. A quantidade de linhas
 *   afetadas por um `UPDATE` condicional vem de `RETURNING`, que é o que
 *   `marcaConviteUsado` usa para manter o uso único do convite.
 */

import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';

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
export async function eContaDeEngenheiro(
  db: BancoRdo,
  usuarioId: UsuarioId,
): Promise<boolean> {
  const linhas = await db
    .select({ eEngenheiro: usuario.eEngenheiro })
    .from(usuario)
    .where(eq(usuario.id, usuarioId))
    .limit(1);
  return linhas[0]?.eEngenheiro === 1;
}

/** E-mail é guardado normalizado em caixa baixa, para o UNIQUE valer de fato. */
export function normalizaEmail(bruto: string): string {
  return bruto.trim().toLocaleLowerCase('pt-BR');
}

export async function buscaUsuarioPorEmail(
  db: BancoRdo,
  email: string,
): Promise<LinhaDeUsuario | null> {
  const linhas = await db
    .select({ id: usuario.id, hashDeSenha: usuario.hashDeSenha })
    .from(usuario)
    .where(eq(usuario.email, normalizaEmail(email)))
    .limit(1);
  return linhas[0] ?? null;
}

export async function existeUsuario(
  db: BancoRdo,
  usuarioId: UsuarioId,
): Promise<boolean> {
  const linhas = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.id, usuarioId))
    .limit(1);
  return linhas.length > 0;
}

export async function insereUsuario(
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
): Promise<void> {
  await db.insert(usuario).values({
    id: dados.id,
    nome: dados.nome,
    email: normalizaEmail(dados.email),
    hashDeSenha: dados.hashDeSenha,
    eEngenheiro: dados.eEngenheiro ? 1 : 0,
    criadoEm: dados.criadoEm,
  });
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
export async function marcaContaComoEngenheiro(
  db: BancoRdo,
  usuarioId: UsuarioId,
): Promise<void> {
  await db.update(usuario).set({ eEngenheiro: 1 }).where(eq(usuario.id, usuarioId));
}

export interface LinhaDeSessao {
  readonly id: SessaoId;
  readonly usuarioId: UsuarioId;
  readonly expiraEm: Instante;
  readonly revogadaEm: Instante | null;
}

export async function insereSessao(
  db: BancoRdo,
  dados: {
    readonly id: SessaoId;
    readonly usuarioId: UsuarioId;
    readonly tokenHash: string;
    readonly criadoEm: Instante;
    readonly expiraEm: Instante;
  },
): Promise<void> {
  await db.insert(sessao).values({ ...dados, revogadaEm: null });
}

export async function buscaSessaoPorHash(
  db: BancoRdo,
  tokenHash: string,
): Promise<LinhaDeSessao | null> {
  const linhas = await db
    .select({
      id: sessao.id,
      usuarioId: sessao.usuarioId,
      expiraEm: sessao.expiraEm,
      revogadaEm: sessao.revogadaEm,
    })
    .from(sessao)
    .where(eq(sessao.tokenHash, tokenHash))
    .limit(1);
  return linhas[0] ?? null;
}

export async function revogaSessaoPorHash(
  db: BancoRdo,
  tokenHash: string,
  em: Instante,
): Promise<void> {
  await db
    .update(sessao)
    .set({ revogadaEm: em })
    .where(and(eq(sessao.tokenHash, tokenHash), isNull(sessao.revogadaEm)));
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
export async function buscaAcessoAtivo(
  db: BancoRdo,
  usuarioId: UsuarioId,
  obraId: ObraId,
): Promise<LinhaDeAcesso | null> {
  const linhas = await db
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
    .limit(1);
  return linhas[0] ?? null;
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
export async function listaAcessosDaObra(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeAcessoDaObra[]> {
  return db
    .select({
      id: acesso.id,
      usuarioId: acesso.usuarioId,
      perfil: acesso.perfil,
      liberadoEm: acesso.liberadoEm,
    })
    .from(acesso)
    .where(and(eq(acesso.obraId, obraId), isNull(acesso.revogadoEm)))
    .orderBy(acesso.liberadoEm);
}

export async function buscaAcessoPorId(
  db: BancoRdo,
  acessoId: AcessoId,
): Promise<LinhaDeAcesso | null> {
  const linhas = await db
    .select({
      id: acesso.id,
      obraId: acesso.obraId,
      usuarioId: acesso.usuarioId,
      perfil: acesso.perfil,
    })
    .from(acesso)
    .where(and(eq(acesso.id, acessoId), isNull(acesso.revogadoEm)))
    .limit(1);
  return linhas[0] ?? null;
}

export async function insereAcesso(
  db: BancoRdo,
  dados: {
    readonly id: AcessoId;
    readonly obraId: ObraId;
    readonly usuarioId: UsuarioId;
    readonly perfil: Perfil;
    readonly liberadoPor: UsuarioId;
    readonly liberadoEm: Instante;
  },
): Promise<void> {
  await db.insert(acesso).values({ ...dados, revogadoPor: null, revogadoEm: null });
}

/** Revogação **não apaga a linha** (2.4): o histórico de quem teve acesso fica. */
export async function marcaAcessoRevogado(
  db: BancoRdo,
  acessoId: AcessoId,
  por: UsuarioId,
  em: Instante,
): Promise<void> {
  await db
    .update(acesso)
    .set({ revogadoPor: por, revogadoEm: em })
    .where(and(eq(acesso.id, acessoId), isNull(acesso.revogadoEm)));
}

/**
 * Revoga o acesso **e** confere, na mesma transação, que sobra engenheiro.
 *
 * ## Por que existe, e por que só agora
 *
 * A conferência e a revogação eram duas chamadas soltas. Com o
 * `better-sqlite3`, que era **síncrono**, nada rodava entre uma e outra: o
 * processo é de uma linha só e não havia ponto de intercalação. Com o driver de
 * rede há um `await` no meio, e duas revogações simultâneas podem **as duas**
 * ler `total = 2`, passar pela trava e revogar — deixando a obra sem engenheiro
 * responsável, que é justamente o que a regra existe para impedir.
 *
 * É regressão da migração para Postgres, de 17/09/2026, e não um defeito
 * antigo. Achada pela frente que converteu este módulo.
 *
 * ## Como fica correto
 *
 * `FOR UPDATE` nas linhas de acesso da obra. A segunda transação fica esperando
 * a primeira terminar e só então conta — aí ela vê `total = 1` e recusa.
 *
 * Ao contrário do uso único do convite, aqui **não existe restrição no banco**
 * por trás: "ao menos um engenheiro por obra" não é expressável em `CHECK`,
 * porque olha outras linhas. O bloqueio é a única defesa.
 */
export async function revogaSeSobrarEngenheiro(
  db: BancoRdo,
  acessoId: AcessoId,
  obraId: ObraId,
  ehEngenheiro: boolean,
  por: UsuarioId,
  em: Instante,
): Promise<{ readonly revogado: boolean }> {
  return db.transaction(async (tx) => {
    if (ehEngenheiro) {
      // `FOR UPDATE` serializa: quem chegar depois espera e vê o resultado.
      const ativos = await tx
        .select({ id: acesso.id })
        .from(acesso)
        .where(
          and(
            eq(acesso.obraId, obraId),
            eq(acesso.perfil, 'engenheiro'),
            isNull(acesso.revogadoEm),
          ),
        )
        .for('update');

      if (ativos.length <= 1) return { revogado: false };
    }

    await tx
      .update(acesso)
      .set({ revogadoPor: por, revogadoEm: em })
      .where(and(eq(acesso.id, acessoId), isNull(acesso.revogadoEm)));

    return { revogado: true };
  });
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

export async function insereConvite(
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
): Promise<void> {
  await db.insert(convite).values({ ...dados, usadoPor: null, usadoEm: null });
}

export async function buscaConvitePorHash(
  db: BancoRdo,
  tokenHash: string,
): Promise<LinhaDeConvite | null> {
  const linhas = await db
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
    .limit(1);
  return linhas[0] ?? null;
}

/**
 * Marca o convite como usado **só se ainda não estiver**.
 *
 * O `WHERE usado_em IS NULL` é o que faz o uso único valer mesmo com dois
 * aceites simultâneos: o segundo `UPDATE` afeta zero linhas, e quem chama
 * desfaz a transação. Conferir com um `SELECT` antes não bastaria.
 *
 * O `RETURNING` está aqui porque o Postgres não tem o `changes` do driver
 * antigo: são as linhas que o `UPDATE` de fato alcançou, contadas pelo próprio
 * banco, no mesmo comando. Contá-las depois, com outra consulta, reabriria a
 * janela que este `WHERE` fecha.
 */
export async function marcaConviteUsado(
  db: BancoRdo,
  conviteId: ConviteId,
  por: UsuarioId,
  em: Instante,
): Promise<number> {
  const afetadas = await db
    .update(convite)
    .set({ usadoPor: por, usadoEm: em })
    .where(and(eq(convite.id, conviteId), isNull(convite.usadoEm)))
    .returning({ id: convite.id });
  return afetadas.length;
}

/**
 * Obras que o usuário pode ver.
 *
 * Junta `obra` só para trazer o contrato, que é o rótulo da tela de escolha.
 * Nenhum outro campo de obra sai daqui, e nome de pessoa nenhum.
 */
export async function listaObrasComAcesso(
  db: BancoRdo,
  usuarioId: UsuarioId,
): Promise<ObraResumo[]> {
  return db
    .select({ obraId: obra.id, contrato: obra.contrato, perfil: acesso.perfil })
    .from(acesso)
    .innerJoin(obra, eq(obra.id, acesso.obraId))
    .where(and(eq(acesso.usuarioId, usuarioId), isNull(acesso.revogadoEm)))
    .orderBy(obra.contrato);
}

/**
 * O sistema já tem conta de engenheiro?
 *
 * Pergunta do **comando de instalação**, que existe para a primeira delas.
 * Note que não há consulta equivalente na autorização: lá a pergunta é sempre
 * sobre uma conta, nunca sobre o estado global do sistema. Uma regra que lê
 * "ainda não existe nenhum" reabre sozinha quando alguém apaga o último.
 */
export async function existeContaDeEngenheiro(db: BancoRdo): Promise<boolean> {
  const linhas = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(eq(usuario.eEngenheiro, 1))
    .limit(1);
  return linhas.length > 0;
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
export async function existeContaComSenha(db: BancoRdo): Promise<boolean> {
  const linhas = await db
    .select({ id: usuario.id })
    .from(usuario)
    .where(isNotNull(usuario.hashDeSenha))
    .limit(1);
  return linhas.length > 0;
}

/**
 * Quantos engenheiros ativos a obra tem.
 *
 * `count()` do Drizzle, e não `sql<number>`count(*)``: no Postgres o `count(*)`
 * cru é `bigint`, que o driver entrega como **texto**, e a contagem entraria
 * numa comparação numérica valendo `"2"`. O ajudante já pede `::int`.
 */
export async function contaEngenheirosAtivos(
  db: BancoRdo,
  obraId: ObraId,
): Promise<number> {
  const linhas = await db
    .select({ total: count() })
    .from(acesso)
    .where(
      and(
        eq(acesso.obraId, obraId),
        eq(acesso.perfil, 'engenheiro'),
        isNull(acesso.revogadoEm),
      ),
    );
  return linhas[0]?.total ?? 0;
}

export function idDeAcesso(valor: string): AcessoId {
  return idConfiavel<'acesso'>(valor);
}
