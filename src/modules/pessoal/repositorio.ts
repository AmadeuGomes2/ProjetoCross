/**
 * Acesso ao banco do módulo `pessoal`. Possui `pessoa` e `passagem_pessoa`.
 *
 * Toda consulta recebe `obraId`: é a segunda camada da fronteira de confiança
 * (docs/arquitetura/v1.md, 5.2, item 2). Não existe leitura sem filtro de obra.
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

export function inserePessoa(
  db: BancoRdo,
  dados: {
    readonly id: PessoaId;
    readonly obraId: ObraId;
    readonly nome: string;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
  },
): void {
  db.insert(pessoa).values(dados).run();
}

export function buscaPessoa(
  db: BancoRdo,
  obraId: ObraId,
  pessoaId: PessoaId,
): LinhaDePessoa | null {
  return (
    db
      .select({ id: pessoa.id, nome: pessoa.nome })
      .from(pessoa)
      .where(and(eq(pessoa.obraId, obraId), eq(pessoa.id, pessoaId)))
      .get() ?? null
  );
}

export function contaPessoas(db: BancoRdo, obraId: ObraId): number {
  return db.select({ id: pessoa.id }).from(pessoa).where(eq(pessoa.obraId, obraId)).all()
    .length;
}

export interface LinhaDePassagem {
  readonly id: PassagemPessoaId;
  readonly pessoaId: PessoaId;
  readonly funcaoId: FuncaoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export function inserePassagem(
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
): void {
  db.insert(passagemPessoa).values(dados).run();
}

const CAMPOS_DA_PASSAGEM = {
  id: passagemPessoa.id,
  pessoaId: passagemPessoa.pessoaId,
  funcaoId: passagemPessoa.funcaoId,
  entrada: passagemPessoa.entrada,
  saida: passagemPessoa.saida,
} as const;

export function listaPassagensDaPessoa(
  db: BancoRdo,
  obraId: ObraId,
  pessoaId: PessoaId,
): LinhaDePassagem[] {
  return db
    .select(CAMPOS_DA_PASSAGEM)
    .from(passagemPessoa)
    .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.pessoaId, pessoaId)))
    .orderBy(asc(passagemPessoa.entrada))
    .all();
}

export function buscaPassagem(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemPessoaId,
): LinhaDePassagem | null {
  return (
    db
      .select(CAMPOS_DA_PASSAGEM)
      .from(passagemPessoa)
      .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.id, passagemId)))
      .get() ?? null
  );
}

export function atualizaSaida(
  db: BancoRdo,
  obraId: ObraId,
  passagemId: PassagemPessoaId,
  saida: DiaPuro,
): void {
  db.update(passagemPessoa)
    .set({ saida })
    .where(and(eq(passagemPessoa.obraId, obraId), eq(passagemPessoa.id, passagemId)))
    .run();
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
 */
export function listaPassagensDaObra(db: BancoRdo, obraId: ObraId): LinhaDeEfetivo[] {
  return db
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
    .where(eq(passagemPessoa.obraId, obraId))
    .all();
}

export function listaPessoas(db: BancoRdo, obraId: ObraId): LinhaDePessoa[] {
  return db
    .select({ id: pessoa.id, nome: pessoa.nome })
    .from(pessoa)
    .where(eq(pessoa.obraId, obraId))
    .orderBy(asc(pessoa.nome))
    .all();
}

export interface LinhaDePassagemComTermo extends LinhaDePassagem {
  readonly funcaoTermo: string;
}

export function listaTodasAsPassagens(
  db: BancoRdo,
  obraId: ObraId,
): LinhaDePassagemComTermo[] {
  return db
    .select({ ...CAMPOS_DA_PASSAGEM, funcaoTermo: funcao.termo })
    .from(passagemPessoa)
    .innerJoin(funcao, eq(funcao.id, passagemPessoa.funcaoId))
    .where(eq(passagemPessoa.obraId, obraId))
    .orderBy(asc(passagemPessoa.entrada))
    .all();
}
