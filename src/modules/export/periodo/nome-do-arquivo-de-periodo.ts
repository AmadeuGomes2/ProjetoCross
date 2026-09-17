/**
 * Nome do arquivo exportado de um período.
 *
 * `docs/arquitetura/periodo.md`, 4.4: `rdo-periodo-AAAA-MM-DD-a-AAAA-MM-DD`,
 * do primeiro ao último dia do conjunto, com a extensão do formato.
 *
 * Duas coisas que o nome **não** faz, e por quê:
 *
 * - **não enumera os dias.** Trinta dias no nome passariam do limite de caminho
 *   do Windows, e um conjunto de 366 dias não caberia em lugar nenhum;
 * - **não carrega nome de pessoa**, nunca. Nome de arquivo circula em e-mail e
 *   em WhatsApp, e é o vazamento mais fácil de cometer (decisão 17.3).
 *
 * A faixa no nome não afirma continuidade: é endereço de pasta, não conteúdo.
 * Quem afirma o que saiu é o `RDO Nº` do documento, que é a lista, e a trilha,
 * que tem uma linha por dia.
 */

import type { DiaPuro } from '../../../shared/date/dia';
import type { FormatoDeExportacaoDePeriodo } from './portas';

export function nomeDoArquivoDoPeriodo(
  primeiroDia: DiaPuro,
  ultimoDia: DiaPuro,
  formato: FormatoDeExportacaoDePeriodo,
): string {
  const extensao = formato === 'PDF' ? 'pdf' : 'xlsx';
  return `rdo-periodo-${primeiroDia}-a-${ultimoDia}.${extensao}`;
}
