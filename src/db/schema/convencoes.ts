/**
 * Convenções do esquema físico, escritas uma vez.
 *
 * Fonte: docs/arquitetura/v1.md, seção 1. Toda tabela deste diretório usa
 * estas funções; quem escrever coluna de dia, de instante, de booleano ou de
 * quantidade à mão está divergindo e precisa dizer por quê.
 *
 * ## Postgres, desde 17/09/2026
 *
 * O banco era SQLite em arquivo, que não existe em serverless: a Vercel não tem
 * disco persistente, e a aplicação simplesmente não subia. O destino é o Neon.
 *
 * Duas convenções mudaram de forma, e uma delas ficou **melhor**:
 *
 * - **dia puro** era `TEXT` com `GLOB` mais o truque `date(x) = x` para pegar
 *   31 de setembro. Agora é o tipo `DATE` do Postgres, que valida o calendário
 *   sozinho: recusa `2026-09-31`, recusa `2026-02-29`, aceita `2024-02-29`.
 *   O modo `string` do Drizzle devolve `AAAA-MM-DD`, então `DiaPuro` continua
 *   sendo o mesmo texto de sempre para o resto do sistema;
 * - **instante** continua `TEXT`, porque `timestamptz` devolveria
 *   `2026-09-17 12:00:00+00` e o sistema fala ISO-8601 com `Z`. O `GLOB` virou
 *   o operador `~`, com classes `[0-9]` — `\\d` depende de escape e some no
 *   caminho até o banco.
 *
 * `to_date` foi recusado de propósito: no Postgres ele **lança exceção** em
 * data inválida em vez de normalizar, e exceção dentro de um `CHECK` dá erro de
 * driver onde deveria dar violação de restrição.
 */

import { sql } from 'drizzle-orm';
import { check, date, integer, text, type AnyPgColumn } from 'drizzle-orm/pg-core';

import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';

/**
 * Dia de obra: `DATE`, dia puro, sem hora e sem deslocamento.
 *
 * `mode: 'string'` devolve `AAAA-MM-DD`, que é o formato de `DiaPuro`. A
 * comparação continua sendo cronológica — agora por ser data de verdade, e não
 * por coincidência lexicográfica.
 */
export const colunaDia = (nome: string) =>
  date(nome, { mode: 'string' }).$type<DiaPuro>().notNull();
export const colunaDiaOpcional = (nome: string) =>
  date(nome, { mode: 'string' }).$type<DiaPuro>();

/** Instante de auditoria: ISO-8601 em UTC com sufixo `Z`. Nunca hora local. */
export const colunaInstante = (nome: string) => text(nome).$type<Instante>().notNull();
export const colunaInstanteOpcional = (nome: string) => text(nome).$type<Instante>();

/**
 * Quantidade decimal em milésimos (escala 3, `shared/decimal`).
 *
 * `integer` porque `SUM()` de inteiro é exato. Ponto flutuante é proibido no
 * esquema inteiro: binário não soma acumulado sem erro.
 */
export const colunaMilesimos = (nome: string) => integer(nome).notNull();

/**
 * Booleano: `integer` 0/1, com CHECK.
 *
 * O Postgres tem `boolean` de verdade, e ainda assim fica 0/1: trocar o tipo
 * mudaria o valor lido por todo o domínio no meio de uma migração de banco, que
 * é onde se acumulam duas mudanças e se perde qual delas quebrou.
 */
export const colunaBooleano = (nome: string) => integer(nome).notNull();

/** Ordem de exibição da taxonomia. Não é o id, e por isso pode ser reordenada. */
export const colunaOrdem = (nome: string) => integer(nome).notNull();

/**
 * ISO-8601 em UTC, com `Z` e milissegundos.
 *
 * Classes `[0-9]`, e não `\\d`: a barra invertida precisa sobreviver ao
 * TypeScript, ao gerador de migration e ao driver, e em algum desses passos ela
 * some. `[0-9]` não depende de escape nenhum.
 */
const REGEX_INSTANTE =
  "'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'";

/**
 * Instante em UTC, com `Z` e milissegundos.
 *
 * Decisão 3 da seção 7 da arquitetura: "hora local sem deslocamento é como se
 * perde um dia de RDO". O CHECK impede que alguém grave `2026-09-03 23:14:05`.
 */
export function checkInstante(nome: string, coluna: AnyPgColumn) {
  return check(nome, sql`${coluna} ~ ${sql.raw(REGEX_INSTANTE)}`);
}

export function checkInstanteOpcional(nome: string, coluna: AnyPgColumn) {
  return check(nome, sql`${coluna} IS NULL OR ${coluna} ~ ${sql.raw(REGEX_INSTANTE)}`);
}

/** Texto de domínio obrigatório: nulo já barrado pelo NOT NULL, vazio aqui. */
export function checkTextoNaoVazio(nome: string, coluna: AnyPgColumn) {
  return check(nome, sql`length(trim(${coluna})) > 0`);
}

export function checkBooleano(nome: string, coluna: AnyPgColumn) {
  return check(nome, sql`${coluna} IN (0, 1)`);
}

/** Quantidade de produção e de projeto: maior que zero (decisões 13.3 e 13.4). */
export function checkMilesimosPositivo(nome: string, coluna: AnyPgColumn) {
  return check(nome, sql`${coluna} > 0`);
}

/**
 * Exclusão com rastro: os três campos existem juntos ou não existem (30.1).
 *
 * Decisão 30.1, de 16/09/2026: o engenheiro exclui qualquer lançamento,
 * inclusive em dia fechado, e **excluir não apaga linha** — o RDO é documento
 * contratual, e alteração sem registro deixa duas versões do mesmo dia sem
 * ninguém saber qual vale. O motivo é obrigatório porque é ele que responde,
 * meses depois, por que o número mudou; `excluido_em` gravado com o motivo em
 * branco seria rastro pela metade, que é o mesmo que rastro nenhum.
 */
export function checkExclusao(
  nome: string,
  por: AnyPgColumn,
  em: AnyPgColumn,
  motivo: AnyPgColumn,
) {
  return check(
    nome,
    sql`(${em} IS NULL AND ${por} IS NULL AND ${motivo} IS NULL)
       OR (${em} IS NOT NULL AND ${por} IS NOT NULL AND ${motivo} IS NOT NULL AND length(trim(${motivo})) > 0)`,
  );
}

/**
 * Passagem por obra: a saída nunca é anterior à entrada (R14).
 *
 * Uma regra, duas tabelas — `passagem_pessoa` e `passagem_equipamento` —, uma
 * função. A planilha legada tem um período de -716 dias; caso de teste
 * obrigatório 9.
 */
export function checkSaidaNaoAntesDaEntrada(
  nome: string,
  saida: AnyPgColumn,
  entrada: AnyPgColumn,
) {
  return check(nome, sql`${saida} IS NULL OR ${saida} >= ${entrada}`);
}
