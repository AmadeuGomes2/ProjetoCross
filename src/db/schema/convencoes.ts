/**
 * Convenções do esquema físico, escritas uma vez.
 *
 * Fonte: docs/arquitetura/v1.md, seção 1. Toda tabela deste diretório usa
 * estas funções; quem escrever coluna de dia, de instante, de booleano ou de
 * quantidade à mão está divergindo e precisa dizer por quê.
 */

import { sql } from 'drizzle-orm';
import { check, integer, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';

/**
 * Dia de obra: TEXT `AAAA-MM-DD`, dia puro, sem hora e sem deslocamento.
 * Comparação lexicográfica = comparação cronológica, então o índice serve
 * direto e o dump é legível.
 */
export const colunaDia = (nome: string) => text(nome).$type<DiaPuro>().notNull();
export const colunaDiaOpcional = (nome: string) => text(nome).$type<DiaPuro>();

/** Instante de auditoria: ISO-8601 em UTC com sufixo `Z`. Nunca hora local. */
export const colunaInstante = (nome: string) => text(nome).$type<Instante>().notNull();
export const colunaInstanteOpcional = (nome: string) => text(nome).$type<Instante>();

/**
 * Quantidade decimal em milésimos (escala 3, `shared/decimal`).
 * INTEGER porque `SUM()` de inteiro é exato e `REAL` é proibido no esquema
 * inteiro: ponto flutuante binário não soma acumulado.
 */
export const colunaMilesimos = (nome: string) => integer(nome).notNull();

/** Booleano: INTEGER 0/1, com CHECK. SQLite não tem tipo booleano. */
export const colunaBooleano = (nome: string) => integer(nome).notNull();

/** Ordem de exibição da taxonomia. Não é o id, e por isso pode ser reordenada. */
export const colunaOrdem = (nome: string) => integer(nome).notNull();

const GLOB_DIA = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

const GLOB_INSTANTE =
  "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z'";

/**
 * Dia puro válido NO CALENDÁRIO REAL.
 *
 * O GLOB sozinho aceita `2026-09-31`, que foi exatamente o defeito da planilha:
 * encadear dia+1 produziu um 31 de setembro e um RDO datado de outro mês
 * (regras-extraidas §7, caso de teste obrigatório 10). Por isso vai junto
 * `date(x) = x`: o `date()` do SQLite normaliza 2026-09-31 para 2026-10-01, e a
 * comparação denuncia. O `IS NOT NULL` existe porque mês 13 faz `date()`
 * devolver NULL, e CHECK que avalia NULL passa.
 *
 * Isto é mais estrito que a seção 1 da arquitetura, que pede só o GLOB. A
 * validação de calendário continua na borda, em `criaDiaPuro`; aqui ela é a
 * rede, para a rota nova que esquecer a borda.
 */
export function checkDia(nome: string, coluna: AnySQLiteColumn) {
  return check(
    nome,
    sql`${coluna} GLOB ${sql.raw(GLOB_DIA)} AND date(${coluna}) IS NOT NULL AND date(${coluna}) = ${coluna}`,
  );
}

/** Igual ao `checkDia`, aceitando nulo. Usado em `saida`, que é "ainda na obra". */
export function checkDiaOpcional(nome: string, coluna: AnySQLiteColumn) {
  return check(
    nome,
    sql`${coluna} IS NULL OR (${coluna} GLOB ${sql.raw(GLOB_DIA)} AND date(${coluna}) IS NOT NULL AND date(${coluna}) = ${coluna})`,
  );
}

/**
 * Instante em UTC, com `Z` e milissegundos.
 *
 * Decisão 3 da seção 7 da arquitetura: "hora local sem deslocamento é como se
 * perde um dia de RDO". O CHECK impede que alguém grave `2026-09-03 23:14:05`.
 */
export function checkInstante(nome: string, coluna: AnySQLiteColumn) {
  return check(nome, sql`${coluna} GLOB ${sql.raw(GLOB_INSTANTE)}`);
}

export function checkInstanteOpcional(nome: string, coluna: AnySQLiteColumn) {
  return check(nome, sql`${coluna} IS NULL OR ${coluna} GLOB ${sql.raw(GLOB_INSTANTE)}`);
}

/** Texto de domínio obrigatório: nulo já barrado pelo NOT NULL, vazio aqui. */
export function checkTextoNaoVazio(nome: string, coluna: AnySQLiteColumn) {
  return check(nome, sql`length(trim(${coluna})) > 0`);
}

export function checkBooleano(nome: string, coluna: AnySQLiteColumn) {
  return check(nome, sql`${coluna} IN (0, 1)`);
}

/** Quantidade de produção e de projeto: maior que zero (decisões 13.3 e 13.4). */
export function checkMilesimosPositivo(nome: string, coluna: AnySQLiteColumn) {
  return check(nome, sql`${coluna} > 0`);
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
  saida: AnySQLiteColumn,
  entrada: AnySQLiteColumn,
) {
  return check(nome, sql`${saida} IS NULL OR ${saida} >= ${entrada}`);
}
