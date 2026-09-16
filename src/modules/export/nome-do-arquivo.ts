/**
 * Nome do arquivo exportado.
 *
 * Decisão 17.3: `rdo-AAAA-MM-DD-nNNN.pdf`, por exemplo `rdo-2026-09-03-n210.pdf`.
 *
 * A data em `AAAA-MM-DD` ordena sozinha na pasta e o número é o que o fiscal
 * procura. **Sem nome de pessoa, nunca**: o nome do arquivo circula em e-mail e
 * em WhatsApp, e é o vazamento mais fácil de cometer.
 *
 * O número sai como está, sem zeros à esquerda: `n0` no primeiro dia do
 * contrato (decisão 6.1) e `n210` em 03/09/2026. `NNN` na decisão é a forma do
 * exemplo, não largura fixa; completar com zero inventaria um identificador que
 * não é o que o fiscal lê no documento.
 */

import type { DiaPuro } from '../../shared/date/dia';

export function nomeDoArquivoDoRdo(dia: DiaPuro, numeroDoRdo: number): string {
  return `rdo-${dia}-n${numeroDoRdo}.pdf`;
}
