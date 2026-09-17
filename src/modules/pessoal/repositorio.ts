/**
 * Acesso ao banco do módulo `pessoal`. Possui `pessoa` e `passagem_pessoa`.
 *
 * Toda consulta recebe `obraId`: é a segunda camada da fronteira de confiança
 * (docs/arquitetura/v1.md, 5.2, item 2). Não existe leitura sem filtro de obra.
 *
 * ## Assíncrono desde 17/09/2026
 *
 * O driver deixou de ser o `better-sqlite3` síncrono e passou a ser Postgres.
 * Sumiram `.run()`, `.get()` e `.all()`, que eram do dialeto do SQLite; o
 * construtor de consulta do Drizzle para Postgres é o próprio `thenable`, então
 * `await` na consulta é o que a executa. No lugar de `.get()` entra
 * `limit(1)` mais a primeira linha: uma linha ou nenhuma, dito no SQL.
 *
 * `entrada` e `saida` agora são `DATE` de verdade, e não `TEXT`. A leitura
 * continua devolvendo `AAAA-MM-DD`, mas o `ORDER BY` passou a ser ordenação de
 * calendário em vez de coincidência lexicográfica.
 */

import { and, asc, eq } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import { funcao, passagemPessoa, pessoa } from '../../db/schema';
import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type {
  FuncaoId,
  ObraId,
  PassagemPessoaId,
  PessoaId,
  UsuarioId,
} from '../../shared/id';

/** Sem função: ela é atributo da passagem (decisão 29.1). */
export interface LinhaDePessoa {
  readonly id: PessoaId;
  readonly nome: string;
}

export async function inserePessoa(
  db: BancoRdo,
  dados: {
    readonly id: PessoaId;
    readonly obraId: ObraId;
    readonly nome: string;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
  },
): Promise<void> {
  await db.insert(pessoa).values(dados);
}

export async function buscaPessoa(
  db: BancoRdo,
  obraId: ObraId,
  pessoaId: PessoaId,
): Promise<LinhaDePessoa | null> {
  const [linha] = await db
    .select({ id: pessoa.id, nome: pessoa.nome })
    .from(pessoa)
    .where(and(eq(pessoa.obraId, obraId), eq(pessoa.id, pessoaId)))
    .limit(1);
  return linha ?? null;
}

export async function contaPessoas(db: BancoRdo, obraId: ObraId): Promise<number> {
  const linhas = await db
    .select({ id: pessoa.id })
    .from(pessoa)
    .where(eq(pessoa.obraId, obraId));
  return linhas.length;
}

export interface LinhaDePassagem {
  readonly id: PassagemPessoaId;
  readonly pessoaId: PessoaId;
  readonly funcaoId: FuncaoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export async function inserePassagem(
  db: BancoRdo,
  dados: {
    readonly id: PassagemPessoaId;
    readonly obraId: ObraId;
    readonly pessoaId: PessoaId;
    readonly funcaoId: FuncaoId;
    readonly entrada: DiaPuro;
    readonly saida: DiaPuro | null;
    readonly registradoPor: UsuarioId;
    readonly registradoEm: Instante;
  },
): Promise<void> {
  await db.insert(passagemPessoa).values(dados);
}

const CAMPOS_DA_PASSAGEM = {
  id: passagemPessoa.id,
  pessoaId: passagemPessoa.pessoaId,
  funcaoId: passagemPessoa.funcaoId,
  entrada: passagemPessoa.entrada,
  saida: passagemPessoa.saida,
} as const;

export async function listaPassagensDaPessoa(
  db: BancoRdo,
  obraId: ObraId,
  pessoaId: PessoaId,
): Promise<LinhaDePassagem[]> {
  return await db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemPessoa)
    .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.pessoaId, pessoaId)))
    .orderBy(asc(passagemPessoa.entrada));
}

export async function buscaPassagem(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemPessoaId,
): Promise<LinhaDePassagem | null> {
  const [linha] = await db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemPessoa)
    .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.id, passagemId)))
    .limit(1);
  return linha ?? null;
}

export async function atualizaSaida(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemPessoaId,
  saida: DiaPuro,
): Promise<void> {
  await db
    .update(passagemPessoa)
    .set({ saida })
    .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.id, passagemId)));
}

export interface LinhaDeEfetivo {
  readonly pessoaId: PessoaId;
  readonly funcaoId: FuncaoId;
  readonly funcaoTermo: string;
  readonly funcaoOrdem: number;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/**
 * Todas as passagens da obra, cada uma com a **sua** função (decisão 29.1).
 *
 * **Nenhum filtro de data em SQL, de propósito.** Quem decide se a passagem
 * cobre o dia é `intervaloCobreODia`, em `shared/date/intervalo`, que é a
 * única implementação da regra no sistema. Repetir `entrada <= ? AND (saida IS
 * NULL OR saida >= ?)` aqui criaria a segunda verdade que a divergência da
 * planilha provou ser cara (regras-extraidas §1.1).
 *
 * O volume é de dezenas de linhas por obra; o custo não justifica o risco.
 *
 * **Uma consulta só**, e é de propósito: esta é a leitura do caminho quente do
 * RDO. O `innerJoin` traz a função junto; buscar o termo por passagem faria uma
 * ida ao banco por pessoa, que com o banco na rede custa caro.
 */
export async function listaPassagensDaObra(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeEfetivo[]> {
  return await db
    .select({
      pessoaId: passagemPessoa.pessoaId,
      funcaoId: passagemPessoa.funcaoId,
      funcaoTermo: funcao.termo,
      funcaoOrdem: funcao.ordem,
      entrada: passagemPessoa.entrada,
      saida: passagemPessoa.saida,
    })
    .from(passagemPessoa)
    .innerJoin(funcao, eq(funcao.id, passagemPessoa.funcaoId))
    .where(eq(passagemPessoa.obraId, obraId));
}

export async function listaPessoas(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDePessoa[]> {
  return await db
    .select({ id: pessoa.id, nome: pessoa.nome })
    .from(pessoa)
    .where(eq(pessoa.obraId, obraId))
    .orderBy(asc(pessoa.nome));
}

export interface LinhaDePassagemComTermo extends LinhaDePassagem {
  readonly funcaoTermo: string;
}

export async function listaTodasAsPassagens(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDePassagemComTermo[]> {
  return await db
    .select({ ...CAMPOS_DA_PASSAGEM, funcaoTermo: funcao.termo })
    .from(passagemPessoa)
    .innerJoin(funcao, eq(funcao.id, passagemPessoa.funcaoId))
    .where(eq(passagemPessoa.obraId, obraId))
    .orderBy(asc(passagemPessoa.entrada));
}
