/**
 * O estado dos últimos dias da obra, para a tela que abre a obra.
 *
 * Existe porque a obra abria em formulário de cadastro e não dizia nada sobre o
 * trabalho: quantos dias foram lançados, qual está em aberto, o que falta. A
 * captura das telas de 16/09/2026 mostrou o efeito — quem chegava não sabia o
 * que fazer em seguida (`docs/design/auditoria-e-plano.md`).
 *
 * Duas funções puras, sem banco e sem relógio:
 *
 * - `janelaDeDias` monta o calendário para trás a partir de um dia. Usa
 *   `somaDias`, que é aritmética de dia juliano: nunca `Date`, porque o
 *   resultado não pode mudar com o fuso do servidor nem com horário de verão
 *   (CLAUDE.md, Modelo).
 * - `montaPainelDosDias` cruza essa janela com as linhas de `dia_de_obra`.
 *
 * **Ausência de linha é `nao_lancado`, e não `parado`** (decisão 4.2). Ninguém
 * ter lançado nada é ausência de informação; ter lançado que não houve trabalho
 * é informação, e o fiscal lê as duas coisas de formas diferentes. Este módulo
 * não preenche uma com a outra.
 *
 * Nada aqui decide permissão: quem chama já autorizou o acesso à obra.
 */

import { type DiaPuro, somaDias } from '../../shared/date/dia';
import type { EstadoDoDia } from '../../shared/taxonomia';
import type { DiaDeObra } from './tipos';

export interface DiaNoPainel {
  readonly data: DiaPuro;
  readonly estado: 'nao_lancado' | EstadoDoDia;
  readonly fechado: boolean;
  /** Texto do encarregado quando o dia é parado; nulo nos outros casos. */
  readonly motivoParada: string | null;
  /** Congelado no fechamento (6.2). Nulo enquanto o dia está aberto. */
  readonly numeroRdo: number | null;
}

/**
 * Os `quantidade` dias que terminam em `ate`, do mais recente para o mais
 * antigo — que é a ordem em que se lê um painel de "últimos dias".
 */
export function janelaDeDias(ate: DiaPuro, quantidade: number): DiaPuro[] {
  if (quantidade <= 0) return [];
  return Array.from({ length: quantidade }, (_, passo) => somaDias(ate, -passo));
}

/**
 * Cruza a janela de calendário com o que existe no banco.
 *
 * A janela manda: linha fora dela é ignorada, e não estica o painel. Assim a
 * tela não cresce sozinha quando alguém lança um dia antigo.
 */
export function montaPainelDosDias(
  janela: readonly DiaPuro[],
  linhas: readonly DiaDeObra[],
): DiaNoPainel[] {
  const porData = new Map(linhas.map((linha) => [String(linha.data), linha]));

  return janela.map((data) => {
    const linha = porData.get(String(data));
    if (linha === undefined) {
      return {
        data,
        estado: 'nao_lancado',
        fechado: false,
        motivoParada: null,
        numeroRdo: null,
      };
    }
    return {
      data,
      estado: linha.estado,
      // O dia está fechado pelo instante do fechamento, não por quem fechou.
      fechado: linha.fechadoEm !== null,
      motivoParada: linha.motivoParada,
      numeroRdo: linha.numeroRdoCongelado,
    };
  });
}
