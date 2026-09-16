/**
 * Decisão 35.1, de 16/09/2026: **a consulta de período tem teto de 366 dias, a
 * duração do contrato.**
 *
 * Origem das expectativas:
 *
 * - o teto e o motivo dele: `docs/prd/v1.md`, tabela DECISÕES TOMADAS, 35.1;
 * - a contagem `final − inicial + 1`: `docs/dominio/regras-extraidas.md` §8;
 * - os 366 dias: o contrato `P0476/01-25 - BLOCO 02` vai de 05/02/2026 a
 *   05/02/2027 (CLAUDE.md, Domínio). É esse intervalo que o teto precisa
 *   aceitar inteiro — um teto que recusasse a própria obra seria inútil.
 *
 * Por que existe: sem teto, uma requisição pede dez anos de uma vez. É o jeito
 * mais barato de derrubar o servidor de dentro, com sessão válida e sem senha
 * de ninguém.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { DIAS_MAXIMOS_DA_CONSULTA, interpretaPedidoDePeriodo } from './borda/esquemas';

const OBRA = 'b02';

const pede = (dataInicial: string, dataFinal: string) =>
  interpretaPedidoDePeriodo({ obraId: OBRA, dataInicial, dataFinal });

describe('35.1 — teto de dias na consulta de período do RDO', () => {
  it('o teto é a duração do contrato: 366 dias', () => {
    expect(DIAS_MAXIMOS_DA_CONSULTA).toBe(366);
  });

  it('aceita o contrato inteiro, de 05/02/2026 a 05/02/2027', () => {
    // Fronteira de cima: 366 dias contados como `final − inicial + 1`.
    expect(pede('2026-02-05', '2027-02-05').ok).toBe(true);
  });

  it('recusa um dia além do contrato inteiro, que são 367 dias', () => {
    const resultado = pede('2026-02-05', '2027-02-06');

    expect(resultado.ok).toBe(false);
  });

  it('diz quantos dias a consulta aceita quando recusa o período longo demais', () => {
    // Mensagem é para quem vai agir (padroes-codigo, Erro): ela precisa dizer
    // o limite, senão a pessoa tenta de novo às cegas.
    const resultado = pede('2020-01-01', '2030-01-01');

    expect(resultado.ok ? '' : resultado.erro.mensagem).toContain('366 dias');
  });

  it('aceita um período de um dia só', () => {
    // Fronteira de baixo: início igual ao fim é um dia, não zero (§8).
    expect(pede('2026-09-01', '2026-09-01').ok).toBe(true);
  });

  it('recusa a data final anterior à inicial', () => {
    const resultado = pede('2026-09-10', '2026-09-09');

    expect(resultado.ok ? '' : resultado.erro.codigo).toBe(
      CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
    );
  });

  it('recusa 31/09/2026, que o calendário não tem', () => {
    // Caso obrigatório 10 da skill `template-caso-teste`: a aba 31 da planilha
    // produz esse dia. Vale para as duas pontas do período.
    const resultado = pede('2026-09-01', '2026-09-31');

    expect(resultado.ok ? '' : resultado.erro.codigo).toBe(
      CODIGO_ERRO.DIA_FORA_DO_CALENDARIO,
    );
  });

  it('recusa o pedido que chega sem as datas', () => {
    const resultado = interpretaPedidoDePeriodo({ obraId: OBRA });

    expect(resultado.ok).toBe(false);
  });
});
