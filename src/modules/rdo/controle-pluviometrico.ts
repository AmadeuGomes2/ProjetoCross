/**
 * Controle pluviométrico do mês — a aba `PLUVIOMETRIA` da planilha.
 *
 * É a única visão em que a chuva aparece como SÉRIE, e não como um campo dentro
 * do dia: uma linha por dia, com os três turnos, o resumo, o índice e o
 * acumulado corrente. O engenheiro usa para justificar atraso ao fiscal, e por
 * isso o acumulado importa tanto quanto o índice do dia.
 *
 * Layout herdado de `docs/dominio/mapa-planilha.md`, seção `PLUVIOMETRIA`,
 * inclusive `INDICE ACUMUALDO` com a grafia errada, que é o rótulo que o fiscal
 * reconhece. O rótulo vive em `rotulos.ts`, junto dos outros.
 *
 * ## As duas decisões que a planilha não conseguia responder
 *
 * Os 31 dias da aba real estão todos com índice 0, então nada ali distingue
 * "não choveu" de "ninguém mediu". Aqui distingue:
 *
 * - **o índice do dia sai vazio sem lançamento.** Ausência não é zero — a mesma
 *   regra do bloco 9 do documento, e o que denuncia o defeito B5;
 * - **o acumulado carrega o anterior nesse mesmo dia.** Total corrente não tem
 *   buraco: se a coluna zerasse, a última linha deixaria de ser o total do mês,
 *   que é justamente para o que ela serve. É também o que o Excel faz ao somar
 *   `H3 + G4` com `G4` vazia.
 *
 * Não reordena os dias. Quem chama monta o intervalo; ordenar aqui esconderia
 * um defeito de lá.
 */

import {
  formataBr,
  type DiaPuro,
  type NomeDoDia,
  diaDaSemana,
} from '../../shared/date/dia';
import { soma, zero, type Quantidade } from '../../shared/decimal';
import {
  RESUMO_DO_DIA,
  type LetraDeTurno,
  type ResumoDoDia,
} from '../../shared/taxonomia';
import { formataIndiceMm } from './formata';
import type { PluviometriaDoDia } from './portas';
import { calculaResumoDoDia } from './resumo-do-dia';

export interface DiaDoControle {
  readonly data: DiaPuro;
  /** `null` quando ninguém lançou a pluviometria do dia. */
  readonly leitura: PluviometriaDoDia | null;
}

export interface LinhaDoControle {
  readonly data: DiaPuro;
  readonly dataBr: string;
  readonly diaDaSemana: NomeDoDia;
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  /** `null` sem lançamento: a árvore do resumo não opina sobre ausência. */
  readonly resumo: ResumoDoDia | null;
  /** Vazio sem lançamento; `0 mm` quando choveu e não acumulou. */
  readonly indiceTexto: string;
  /** Sempre preenchido: é total corrente. */
  readonly acumuladoTexto: string;
  /**
   * Não houve lançamento nenhum neste dia.
   *
   * Explícito, e não derivado de `indiceTexto === ''` na tela: são perguntas
   * diferentes que hoje coincidem, e a coincidência não é garantida. Quem
   * destaca a linha quer saber da ausência, não do texto.
   */
  readonly leituraAusente: boolean;
}

export interface ControlePluviometrico {
  readonly linhas: readonly LinhaDoControle[];
  readonly totalMm: Quantidade;
  readonly totalMmTexto: string;
  readonly diasTrabalhado: number;
  readonly diasPerca: number;
  readonly diasImpraticavel: number;
  /** Dias sem lançamento nenhum. Não é o mesmo que dia sem chuva. */
  readonly diasSemLeitura: number;
}

export function montaControlePluviometrico(
  dias: readonly DiaDoControle[],
): ControlePluviometrico {
  const linhas: LinhaDoControle[] = [];
  let acumulado = zero();
  let diasTrabalhado = 0;
  let diasPerca = 0;
  let diasImpraticavel = 0;
  let diasSemLeitura = 0;

  for (const { data, leitura } of dias) {
    if (leitura !== null) acumulado = soma([acumulado, leitura.indiceMm]);

    const resumo = calculaResumoDoDia(leitura);
    switch (resumo) {
      case RESUMO_DO_DIA.TRABALHADO:
        diasTrabalhado += 1;
        break;
      case RESUMO_DO_DIA.PERCA:
        diasPerca += 1;
        break;
      case RESUMO_DO_DIA.IMPRATICAVEL:
        diasImpraticavel += 1;
        break;
      case null:
        diasSemLeitura += 1;
        break;
      default:
        // `RESUMO_DO_DIA.VAZIO`: houve lançamento, mas a árvore não classificou
        // — turnos em branco, por exemplo. Não é ausência, e não entra em
        // nenhuma das contagens do painel, igual à planilha.
        break;
    }

    linhas.push({
      data,
      dataBr: formataBr(data),
      diaDaSemana: diaDaSemana(data),
      noiteAnterior: leitura?.noiteAnterior ?? null,
      manha: leitura?.manha ?? null,
      tarde: leitura?.tarde ?? null,
      resumo,
      indiceTexto: formataIndiceMm(leitura?.indiceMm ?? null),
      acumuladoTexto: formataIndiceMm(acumulado),
      leituraAusente: leitura === null,
    });
  }

  return {
    linhas,
    totalMm: acumulado,
    totalMmTexto: formataIndiceMm(acumulado),
    diasTrabalhado,
    diasPerca,
    diasImpraticavel,
    diasSemLeitura,
  };
}
