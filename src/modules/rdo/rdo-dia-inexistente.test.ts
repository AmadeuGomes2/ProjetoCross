/**
 * Decisão 36.1, de 16/09/2026: **dia inexistente vira 404.**
 *
 * Origem da expectativa: `docs/prd/v1.md`, tabela DECISÕES TOMADAS, 36.1.
 * Verificado por HTTP em 16/09/2026: `/rdo/<obra>/2026-09-31` respondia **200**
 * com a frase certa. A frase continua saindo daqui, no `Result`; o que passa a
 * ser 404 é o código, porque o endereço nomeia um documento que não existe e
 * nunca vai existir — e 200 ensina cliente, robô e cache a tratar o erro como
 * página boa.
 *
 * O que **não** é 404 está aqui também, e é a metade que mais importa: dia
 * fora do período do contrato (decisão 23.1) é dia que existe no calendário e
 * resposta que a tela mostra com explicação. Confundir os dois esconderia do
 * engenheiro o aviso de que ele errou o ano.
 */

import { describe, expect, it } from 'vitest';

import { consultaRdoDiario, eDiaInexistente } from './borda/consulta-rdo';
import { criaPortasFalsas, OBRA } from './teste/duplas';

const consulta = (dia: string) =>
  consultaRdoDiario({ obraId: OBRA, dia }, criaPortasFalsas());

describe('36.1 — o dia que o calendário não tem responde 404', () => {
  it('trata 31/09/2026 como dia inexistente', async () => {
    const resultado = await consulta('2026-09-31');

    expect(resultado.ok ? false : eDiaInexistente(resultado.erro)).toBe(true);
  });

  it('mantém a mensagem que diz qual mês não tem qual dia', async () => {
    const resultado = await consulta('2026-09-31');

    expect(resultado.ok ? '' : resultado.erro.mensagem).toBe(
      'O mês 09/2026 não tem o dia 31.',
    );
  });

  it('trata 29/02/2026 como dia inexistente: 2026 não é bissexto', async () => {
    const resultado = await consulta('2026-02-29');

    expect(resultado.ok ? false : eDiaInexistente(resultado.erro)).toBe(true);
  });

  it('não trata como inexistente o dia fora do período do contrato', async () => {
    // Decisão 23.1: a tela diz que a data está fora do contrato. O dia existe.
    const resultado = await consulta('2028-01-01');

    expect(resultado.ok ? true : eDiaInexistente(resultado.erro)).toBe(false);
  });

  it('não recusa o dia que existe e está dentro do contrato', async () => {
    const resultado = await consulta('2026-09-01');

    expect(resultado.ok).toBe(true);
  });
});
