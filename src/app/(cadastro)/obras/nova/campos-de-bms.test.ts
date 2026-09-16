/**
 * Decisão 37.1, de 16/09/2026: o campo `BM'S` **continua obrigatório**, e o
 * formulário passa a explicar em uma linha o que é.
 *
 * Origem da expectativa: `docs/prd/v1.md`, tabela DECISÕES TOMADAS, 37.1 — "o
 * período de medição que agrupa os dias para faturamento" — e o pedido que a
 * originou: quem encomendou o produto não sabia o que era BMS, e o campo é
 * obrigatório para criar a obra.
 *
 * O teste é da **tela** porque a decisão é da tela: a regra de negócio do
 * período já está em `src/modules/obra/periodo-bms.ts`, testada sem HTML.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BlocoDeBms } from './campos-de-bms';

const marcado = () => renderToStaticMarkup(BlocoDeBms());

describe("37.1 — o formulário explica o que é BM'S", () => {
  it('diz que é o período de medição que agrupa os dias para faturamento', () => {
    expect(marcado()).toContain(
      'é o período de medição que agrupa os dias para faturamento',
    );
  });

  it('diz que o número do período sai no cabeçalho de todo RDO', () => {
    expect(marcado()).toContain('O número dele sai no cabeçalho de todo RDO');
  });

  it('mantém os três campos do primeiro período obrigatórios', () => {
    // A 37.1 explica o campo; ela não o afrouxa. Sem período nenhum a obra não
    // existe (21.1), e é isso que o `required` do formulário antecipa.
    const html = marcado();
    const tagDoCampo = (campo: string): string =>
      new RegExp(`<input[^>]*name="${campo}"[^>]*>`).exec(html)?.[0] ?? '';
    const obrigatorios = ['bmsNumero', 'bmsInicio', 'bmsFim'].filter((campo) =>
      tagDoCampo(campo).includes('required'),
    );

    expect(obrigatorios).toEqual(['bmsNumero', 'bmsInicio', 'bmsFim']);
  });
});
