/**
 * CT-227 a CT-231 — bloco 10, comentários.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.6 do PRD.
 *
 * Origem das expectativas:
 * - R12: cada bloco lê a SUA fonte. Na planilha, `01!F52` rotula
 *   `COMENTÁRIOS CROS` e lê a aba `OBSERVAÇÕES CONTRATANTE`, e por isso o bloco
 *   nunca mostrou nada em nenhum dos 31 dias. Reproduzir o defeito seria falha
 *   de fidelidade, não fidelidade;
 * - decisão 10.1: `COMENTÁRIO CONTRATANTE` sai sempre vazio na v1 — o bloco
 *   aparece, o conteúdo não existe;
 * - decisão 11.1: o bloco tem 4 linhas no layout; a 5.ª não some, transborda.
 *   Na tela não há limite de página e as 5 aparecem (CT-231).
 */

import { describe, expect, it } from 'vitest';

import { montaOuFalha } from './teste/ajuda';
import { observacao } from './teste/duplas';

const CINCO_LINHAS = ['linha 1', 'linha 2', 'linha 3', 'linha 4', 'linha 5'].join('\n');
const QUATRO_LINHAS = ['linha 1', 'linha 2', 'linha 3', 'linha 4'].join('\n');

describe('COMENTÁRIOS CROS lê a fonte da CROS', () => {
  it('mostra a observação de lado CROS no bloco da CROS', async () => {
    // CT-227.
    const rdo = await montaOuFalha('2026-09-03', {
      observacoes: {
        '2026-09-03': [observacao('o-1', 'Frente da Rua A liberada às 9h')],
      },
    });
    expect(rdo.comentariosCros.textos).toEqual(['Frente da Rua A liberada às 9h']);
    expect(rdo.comentarioContratante).toEqual([]);
  });

  it('mostra as duas observações do mesmo dia, na ordem de registro', async () => {
    // CT-230, caso obrigatório 11: a planilha tem uma linha por dia e o segundo
    // comentário sobrescreveria o primeiro.
    const rdo = await montaOuFalha('2026-09-03', {
      observacoes: {
        '2026-09-03': [
          observacao('o-1', 'Frente da Rua A liberada às 9h'),
          observacao('o-2', 'Recebido material às 14h'),
        ],
      },
    });
    expect(rdo.comentariosCros.textos).toEqual([
      'Frente da Rua A liberada às 9h',
      'Recebido material às 14h',
    ]);
  });

  it('deixa os dois blocos vazios no dia sem observação', async () => {
    // CT-229: bloco vazio continua ocupando o espaço do gabarito.
    const rdo = await montaOuFalha('2026-09-04');
    expect(rdo.comentariosCros.textos).toEqual([]);
    expect(rdo.comentariosCros.linhas).toEqual([]);
    expect(rdo.comentarioContratante).toEqual([]);
  });

  it('mantém COMENTÁRIO CONTRATANTE vazio mesmo com observação da CROS no dia', async () => {
    // CT-228, decisão 10.1.
    const rdo = await montaOuFalha('2026-09-03', {
      observacoes: { '2026-09-03': [observacao('o-1', 'Frente liberada')] },
    });
    expect(rdo.comentarioContratante).toEqual([]);
  });
});

describe('transbordo do bloco de comentários (decisão 11.1)', () => {
  it('mostra as 5 linhas na tela e marca a 5.ª como transbordo', async () => {
    // CT-231: na tela não há limite de página, e truncar aqui perderia texto
    // que o PDF ainda vai imprimir na continuação.
    const rdo = await montaOuFalha('2026-09-05', {
      observacoes: { '2026-09-05': [observacao('o-3', CINCO_LINHAS)] },
    });
    expect(rdo.comentariosCros.linhas).toHaveLength(5);
    expect(rdo.transbordo.linhasDeComentario).toEqual(['linha 5']);
  });

  it('não transborda com exatamente 4 linhas', async () => {
    // CT-263, fronteira: é o último valor que cabe. Um erro de um criaria
    // segunda página em todo comentário de tamanho normal.
    const rdo = await montaOuFalha('2026-09-04', {
      observacoes: { '2026-09-04': [observacao('o-4', QUATRO_LINHAS)] },
    });
    expect(rdo.comentariosCros.linhas).toHaveLength(4);
    expect(rdo.transbordo.linhasDeComentario).toEqual([]);
    expect(rdo.transbordo.temTransbordo).toBe(false);
  });
});
