/**
 * Resumo do dia, a partir da pluviometria.
 *
 * Árvore de R7, corrigida pelas decisões 3.1 e 3.2 de 16/09/2026. Na ordem,
 * parando na PRIMEIRA condição verdadeira:
 *
 *   1. três letras B                   -> "Trabalhado"
 *   2. existe C  e  índice <  10       -> "Trabalhado"
 *   3. existe C  e  índice >= 10       -> "Perca de produção"
 *   4. existe I                        -> "Impraticavél"
 *   5. caso contrário                  -> vazio
 *
 * Duas coisas que parecem erro e não são:
 *
 * - **Chuva com índice 0 é `Trabalhado`** (passo 2, decisão 3.2). É intencional
 *   e vem da planilha: choveu, mas não acumulou milímetro nenhum.
 * - **A ordem manda mais que a gravidade** (CT-223): com `C` e `I` no mesmo dia
 *   e índice 9, o passo 2 responde antes de o passo 4 ser alcançado, e o dia é
 *   `Trabalhado`. Reordenar "logicamente" quebra a contagem do mês em silêncio.
 *
 * A fronteira do passo 3 é `>= 10`. A planilha testava `< 10` e `> 10` e
 * deixava o 10 exato cair no vazio: é o caso obrigatório 3.
 *
 * Decisão 3.3: este resumo aparece na TELA e nunca no PDF; o gabarito impresso
 * não tem esse campo.
 */

import { type ResumoDoDia, RESUMO_DO_DIA } from '../../shared/taxonomia';
import type { PluviometriaDoDia } from './portas';

const LIMITE_DE_PERCA_EM_MM = 10;

/** `null` quando não houve lançamento: ausência não é vazio calculado. */
export function calculaResumoDoDia(p: PluviometriaDoDia | null): ResumoDoDia | null {
  if (p === null) return null;

  const turnos = [p.noiteAnterior, p.manha, p.tarde];

  if (turnos.every((t) => t === 'B')) return RESUMO_DO_DIA.TRABALHADO;

  if (turnos.includes('C')) {
    return p.indiceMm.lessThan(LIMITE_DE_PERCA_EM_MM)
      ? RESUMO_DO_DIA.TRABALHADO
      : RESUMO_DO_DIA.PERCA;
  }

  if (turnos.includes('I')) return RESUMO_DO_DIA.IMPRATICAVEL;

  return RESUMO_DO_DIA.VAZIO;
}
