/**
 * O fuso mora aqui, e em nenhum outro lugar.
 *
 * CLAUDE.md, Modelo: "Fuso definido e explícito em um lugar só. Nunca dependa
 * do fuso do servidor nem do navegador."
 *
 * Se um dia o fuso virar coluna da obra, muda `fusoDaObra()` e nada mais.
 * Nenhuma outra função do sistema decide qual é o fuso.
 */

import { type DiaPuro, diaPuroConfiavel } from './dia';

export const FUSO_PADRAO = 'America/Sao_Paulo';

export type Fuso = string;

export function fusoDaObra(): Fuso {
  return FUSO_PADRAO;
}

/** Instante de auditoria: ISO-8601 em UTC, com sufixo Z. */
export type Instante = string;

export function instanteAgora(relogio: () => Date = () => new Date()): Instante {
  return relogio().toISOString();
}

/**
 * Que dia é hoje, na obra.
 *
 * Um lançamento feito às 23h50 em São Paulo pertence a esse dia, e não ao dia
 * seguinte em UTC. É por aqui que se perde um dia de RDO quando se usa o
 * relógio cru.
 *
 * O relógio é injetado para que teste não dependa do horário real
 * (padroes-codigo, Testes).
 */
export function hojeNaObra(
  fuso: Fuso = fusoDaObra(),
  relogio: () => Date = () => new Date(),
): DiaPuro {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 'en-CA' formata como AAAA-MM-DD, que é exatamente o nosso formato.
  return diaPuroConfiavel(formatador.format(relogio()));
}

/** O dia informado está no futuro em relação à obra? Decisão 13.2 rejeita. */
export function ehFuturo(
  dia: DiaPuro | string,
  fuso: Fuso = fusoDaObra(),
  relogio: () => Date = () => new Date(),
): boolean {
  return dia > hojeNaObra(fuso, relogio);
}
