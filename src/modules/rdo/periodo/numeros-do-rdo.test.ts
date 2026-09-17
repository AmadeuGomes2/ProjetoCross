/**
 * O `RDO Nº` do consolidado é a **lista**, nunca a faixa.
 *
 * Decisão do dono do produto, 17/09/2026. A faixa foi recusada por um motivo
 * concreto: num conjunto não contíguo ela **afirma no papel algo que o dado não
 * diz**. Escolher 02, 05 e 09 sairia como `209 a 216`, e o fiscal leria oito
 * dias de trabalho onde houve três — num documento que sustenta medição.
 *
 * Este arquivo existe porque o cálculo nasceu com `faixaDeRdoTexto`, escrito
 * contra a versão do contrato anterior à resposta. O campo saiu; estes casos
 * garantem que ele não volte.
 */

import { describe, expect, it } from 'vitest';

import { montaPeriodoOuFalha } from './teste/ajuda-de-periodo';

async function identificacaoDe(dias: readonly string[]) {
  return (await montaPeriodoOuFalha(dias)).identificacao;
}

describe('RDO Nº do consolidado', () => {
  it('lista os números dos dias contíguos, em ordem', async () => {
    const id = await identificacaoDe(['2026-09-02', '2026-09-03', '2026-09-04']);

    expect(id.numerosDoRdo).toEqual([209, 210, 211]);
    expect(id.numerosDoRdoTexto).toBe('209, 210, 211');
  });

  it('lista só os dias escolhidos quando o conjunto tem buraco', async () => {
    const id = await identificacaoDe(['2026-09-02', '2026-09-05', '2026-09-09']);

    // Os dias 03, 04, 06, 07 e 08 NÃO entram: ninguém os escolheu.
    expect(id.numerosDoRdo).toEqual([209, 212, 216]);
    expect(id.numerosDoRdoTexto).toBe('209, 212, 216');
  });

  it('com um dia só, sai o número sozinho', async () => {
    const id = await identificacaoDe(['2026-09-02']);

    expect(id.numerosDoRdo).toEqual([209]);
    expect(id.numerosDoRdoTexto).toBe('209');
  });

  it('nunca produz texto de faixa, nem quando os dias são seguidos', async () => {
    const id = await identificacaoDe(['2026-09-02', '2026-09-03', '2026-09-04']);

    expect(id.numerosDoRdoTexto).not.toContain(' a ');
    expect(id.numerosDoRdoTexto).not.toMatch(/^\d+\s*[-–—]\s*\d+$/);
  });

  it('não expõe mais o campo de faixa', async () => {
    const id = await identificacaoDe(['2026-09-02', '2026-09-03']);

    expect(id).not.toHaveProperty('faixaDeRdoTexto');
  });
});
