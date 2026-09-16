/**
 * Decisão 36.1, a parte do lançamento — **sem sessão, redireciona**.
 *
 * Origem da expectativa, não lida da implementação: `docs/prd/v1.md`, DECISÕES
 * TOMADAS, 36.1, "Códigos HTTP uniformizados: sem sessão **redireciona**". A
 * tela de lançamento respondia 200 com "Sua sessão terminou. Entre de novo.",
 * enquanto `(cadastro)` e `(rdo)` já redirecionavam para `/entrar`. Monitoramento
 * e cache leem o código, não a mensagem.
 *
 * O leitor de ator é injetado (padroes-codigo, Testes: "sem rede, sem relógio
 * real, sem sistema de arquivos. Injete"). Sem isso o teste precisaria de um
 * ciclo de requisição do Next em volta para ler o cookie.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO, erro, erroDeAcesso } from '../../shared/result';
import { carregaDadosDaTelaProtegida, ENTRADA } from './_dados';

/** O que `atorDaRequisicaoOuRecusa` devolve quando o cookie não vale nada. */
const semSessao = () =>
  Promise.resolve(
    erro(erroDeAcesso(CODIGO_ERRO.NAO_ENCONTRADO, 'Sua sessão terminou. Entre de novo.')),
  );

/**
 * O `redirect` do App Router sinaliza por exceção com `digest`. Ler o campo sem
 * `as` exige estreitar: `in` já estreita `unknown` em TypeScript.
 */
function digestDoErro(e: unknown): string {
  if (typeof e !== 'object' || e === null || !('digest' in e)) return '';
  const { digest } = e;
  return typeof digest === 'string' ? digest : '';
}

async function digestAoCarregar(obraId: string, data: string): Promise<string> {
  try {
    await carregaDadosDaTelaProtegida(obraId, data, semSessao);
    return '';
  } catch (e) {
    return digestDoErro(e);
  }
}

describe('decisão 36.1: a tela de lançamento sem sessão', () => {
  it('redireciona para a entrada em vez de responder a tela com um recado', async () => {
    const digest = await digestAoCarregar('obra-b02', '2026-09-03');

    expect(digest).toContain('NEXT_REDIRECT');
    expect(digest).toContain(ENTRADA);
  });

  it('redireciona antes de olhar a data, para não responder nada a quem não entrou', async () => {
    // 31/09 não existe no calendário (R24). Sem sessão, nem essa resposta sai.
    const digest = await digestAoCarregar('obra-b02', '2026-09-31');

    expect(digest).toContain('NEXT_REDIRECT');
  });
});
