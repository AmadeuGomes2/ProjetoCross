/**
 * Dia de obra: dia puro, sem hora e sem deslocamento.
 *
 * CLAUDE.md, Modelo: "Data de obra é dia puro, sem hora. Fuso definido e
 * explícito em um lugar só." Um lançamento feito às 23h no celular pertence ao
 * dia que o encarregado escolheu, não ao dia do relógio do servidor.
 *
 * Por isso `DiaPuro` é uma string `AAAA-MM-DD` com tipo de marca, e NUNCA um
 * `Date`. Comparar dias vira comparar strings, que em `AAAA-MM-DD` ordena igual
 * ao calendário. Nenhuma função daqui constrói `Date` para representar um dia.
 */

import { CODIGO_ERRO, erro, erroDeEntrada, ok, type Result } from '../result';
import type { ErroDeEntrada } from '../result';

declare const marcaDiaPuro: unique symbol;

/** String `AAAA-MM-DD` já validada contra o calendário real. */
export type DiaPuro = string & { readonly [marcaDiaPuro]: true };

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Dia da semana como o documento exige: capitalizado e com hífen. */
const NOME_DO_DIA = [
  'Domingo',
  'Segunda-Feira',
  'Terça-Feira',
  'Quarta-Feira',
  'Quinta-Feira',
  'Sexta-Feira',
  'Sábado',
] as const;

export type NomeDoDia = (typeof NOME_DO_DIA)[number];

export function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ehBissexto(ano) ? 29 : 28;
  return DIAS_POR_MES[mes - 1] ?? 0;
}

/**
 * Única porta de entrada para um dia de obra.
 *
 * Valida contra o calendário real: 31/09 e 29/02 de ano não bissexto são
 * rejeitados. A planilha legada gerava 31 de setembro encadeando dia+1 e
 * imprimia um RDO datado de outro mês.
 */
export function criaDiaPuro(bruto: string): Result<DiaPuro, ErroDeEntrada> {
  const casou = FORMATO.exec(bruto);
  if (casou === null) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_INVALIDO,
        'A data precisa estar no formato AAAA-MM-DD.',
      ),
    );
  }

  const ano = Number(casou[1]);
  const mes = Number(casou[2]);
  const dia = Number(casou[3]);

  if (mes < 1 || mes > 12) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_FORA_DO_CALENDARIO,
        'O mês precisa estar entre 1 e 12.',
      ),
    );
  }
  if (dia < 1 || dia > diasNoMes(ano, mes)) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_FORA_DO_CALENDARIO,
        `O mês ${String(mes).padStart(2, '0')}/${ano} não tem o dia ${dia}.`,
      ),
    );
  }

  return ok(bruto as DiaPuro);
}

/** Para dia vindo do banco, já validado na escrita. Não use com entrada de usuário. */
export function diaPuroConfiavel(valor: string): DiaPuro {
  return valor as DiaPuro;
}

export function partesDoDia(dia: DiaPuro | string): {
  ano: number;
  mes: number;
  dia: number;
} {
  return {
    ano: Number(dia.slice(0, 4)),
    mes: Number(dia.slice(5, 7)),
    dia: Number(dia.slice(8, 10)),
  };
}

/** Exibição sempre em pt-BR. Nunca `mm/dd`. */
export function formataBr(dia: DiaPuro | string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
}

/**
 * Número de dias desde a época, contando só calendário.
 *
 * Fórmula de dias julianos, sem passar por `Date`: assim o resultado não
 * depende de fuso, de horário de verão nem do relógio da máquina.
 */
function numeroDoDia(dia: DiaPuro | string): number {
  const { ano, mes, dia: d } = partesDoDia(dia);
  const a = Math.floor((14 - mes) / 12);
  const y = ano + 4800 - a;
  const m = mes + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function doNumeroDoDia(n: number): DiaPuro {
  let a = n + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  a = a - Math.floor((146097 * b) / 4);
  const c = Math.floor((4 * a + 3) / 1461);
  a = a - Math.floor((1461 * c) / 4);
  const d = Math.floor((5 * a + 2) / 153);

  const dia = a - Math.floor((153 * d + 2) / 5) + 1;
  const mes = d + 3 - 12 * Math.floor(d / 10);
  const ano = 100 * b + c - 4800 + Math.floor(d / 10);

  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
    dia,
  ).padStart(2, '0')}` as DiaPuro;
}

/**
 * Diferença em dias de calendário, do primeiro para o segundo.
 *
 * É a base do número do RDO (decisão 6.1: o primeiro dia do contrato é o 0).
 * Negativa quando o dia é anterior ao início.
 */
export function diferencaEmDias(de: DiaPuro | string, ate: DiaPuro | string): number {
  return numeroDoDia(ate) - numeroDoDia(de);
}

export function somaDias(dia: DiaPuro | string, quantidade: number): DiaPuro {
  return doNumeroDoDia(numeroDoDia(dia) + quantidade);
}

export function diaDaSemana(dia: DiaPuro | string): NomeDoDia {
  // 1970-01-01 foi uma quinta-feira; o número juliano de 1970-01-01 é 2440588.
  const indice = (((numeroDoDia(dia) + 1) % 7) + 7) % 7;
  return NOME_DO_DIA[indice] ?? 'Domingo';
}

export function ehDomingo(dia: DiaPuro | string): boolean {
  return diaDaSemana(dia) === 'Domingo';
}

export function primeiroDiaDoMes(ano: number, mes: number): DiaPuro {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-01` as DiaPuro;
}

export function ultimoDiaDoMes(ano: number, mes: number): DiaPuro {
  const ultimo = diasNoMes(ano, mes);
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
    ultimo,
  ).padStart(2, '0')}` as DiaPuro;
}

/** Todos os dias de um mês. Nunca inventa 31 de setembro. */
export function diasDoMes(ano: number, mes: number): DiaPuro[] {
  const total = diasNoMes(ano, mes);
  const dias: DiaPuro[] = [];
  for (let d = 1; d <= total; d += 1) {
    dias.push(
      `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(
        d,
      ).padStart(2, '0')}` as DiaPuro,
    );
  }
  return dias;
}

/** Comparação de dia é comparação de dia, nunca de instante. */
export function comparaDias(a: DiaPuro | string, b: DiaPuro | string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function diaEstaNoIntervalo(
  dia: DiaPuro | string,
  inicio: DiaPuro | string,
  fim: DiaPuro | string,
): boolean {
  return dia >= inicio && dia <= fim;
}
