/**
 * CT-197 a CT-207 — produção controlada, bloco 7.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.3 do PRD.
 *
 * Origem das expectativas:
 * - R5: `executado` é a soma do dia, `acumulado` é a soma até o dia inclusive,
 *   sempre recalculada do zero, e `percentual = acumulado / projeto`;
 * - decisão 17.2: produção zero sai como `-` em `EXEC.` e `ACUM.`, e NÃO no
 *   percentual (leitura literal registrada em docs/prd/v1.md:77-82);
 * - caso obrigatório 6: acumulado acima do projeto avisa e não bloqueia; igual
 *   ao projeto é 100% sem aviso;
 * - R6: soma decimal exata, porque 0,1 + 0,2 em binário dá 0,30000000000000004;
 * - gabarito, bloco 7: quatro linhas fixas, duas casas e separador brasileiro.
 */

import { describe, expect, it } from 'vitest';

import { calculaProducaoControlada, type LinhaDeProducao } from './producao';
import { montaOuFalha } from './teste/ajuda';
import {
  dia,
  lancamentoDeProducao,
  SERVICO_FRESA_CAPA,
  SERVICO_IMPLANTACAO,
  SERVICO_RECICLAGEM,
  SERVICOS_PADRAO,
} from './teste/duplas';

/** O contexto de CT-197 a CT-207. */
const PRODUCAO_PADRAO = [
  lancamentoDeProducao('l-1', SERVICO_FRESA_CAPA, '2026-03-09', '1000'),
  lancamentoDeProducao('l-2', SERVICO_FRESA_CAPA, '2026-09-03', '234,5'),
];

function linhaDe(linhas: readonly LinhaDeProducao[], nome: string): LinhaDeProducao {
  const linha = linhas.find((l) => l.nome === nome);
  if (linha === undefined) throw new Error(`serviço ausente no bloco: ${nome}`);
  return linha;
}

describe('as quatro colunas do bloco 7', () => {
  it('mostra executado, acumulado, projeto e percentual do dia', async () => {
    // CT-197, caminho feliz completo.
    const rdo = await montaOuFalha('2026-09-03', { producao: PRODUCAO_PADRAO });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.executadoTexto).toBe('234,50');
    expect(linha.acumuladoTexto).toBe('1.234,50');
    expect(linha.projetoTexto).toBe('2.210,39');
    expect(linha.percentualTexto).toBe('55,85%');
  });

  it('mostra os quatro serviços, na ordem do cadastro, mesmo zerados', async () => {
    // CT-200: posições fixas do layout; esconder a linha desalinha o bloco.
    const rdo = await montaOuFalha('2026-09-03', { producao: PRODUCAO_PADRAO });
    expect(rdo.producao.map((l) => l.nome)).toEqual([
      'REC.(FRESA+CAPA)',
      'REC.(FRESA+BINDER+CAPA)',
      'RECICLAGEM(BASE+CAPA)',
      'IM.(SUBLEITO+BASE+CAPA)',
    ]);
  });

  it('usa o separador brasileiro no acumulado', async () => {
    // CT-206, caso obrigatório 15: separador trocado transforma catorze mil em
    // catorze na leitura do fiscal.
    const rdo = await montaOuFalha('2026-09-03', {
      producao: [
        lancamentoDeProducao('l-3', SERVICO_IMPLANTACAO, '2026-09-03', '14163,33'),
      ],
    });
    const linha = linhaDe(rdo.producao, 'IM.(SUBLEITO+BASE+CAPA)');
    expect(linha.acumuladoTexto).toBe('14.163,33');
    expect(linha.acumuladoTexto).not.toBe('14,163.33');
  });
});

describe('executado e acumulado, fronteiras da data (R5)', () => {
  it('não soma no acumulado o lançamento de data posterior ao dia', async () => {
    // CT-207, fronteira: o acumulado é `≤ D`. Incluir o futuro é o erro
    // simétrico de excluir o próprio dia.
    const linhas = calculaProducaoControlada(
      SERVICOS_PADRAO,
      PRODUCAO_PADRAO,
      dia('2026-09-02'),
    );
    expect(linhaDe(linhas, 'REC.(FRESA+CAPA)').acumuladoTexto).toBe('1.000,00');
  });

  it('soma no acumulado o lançamento do próprio dia', async () => {
    // A outra metade da fronteira: `≤` inclui o dia consultado.
    const linhas = calculaProducaoControlada(
      SERVICOS_PADRAO,
      PRODUCAO_PADRAO,
      dia('2026-09-03'),
    );
    expect(linhaDe(linhas, 'REC.(FRESA+CAPA)').acumuladoTexto).toBe('1.234,50');
  });

  it('mostra traço no executado do dia sem produção e mantém o acumulado', async () => {
    // CT-198: executado vazio, acumulado cheio.
    const rdo = await montaOuFalha('2026-03-10', { producao: PRODUCAO_PADRAO });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.executadoTexto).toBe('-');
    expect(linha.acumuladoTexto).toBe('1.000,00');
  });

  it('mostra traço nas duas colunas antes do primeiro lançamento', async () => {
    // CT-199: estado inicial de todo serviço; o percentual continua numérico.
    const rdo = await montaOuFalha('2026-03-08', { producao: PRODUCAO_PADRAO });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.executadoTexto).toBe('-');
    expect(linha.acumuladoTexto).toBe('-');
    expect(linha.percentualTexto).toBe('0,00%');
    expect(linha.percentualTexto).not.toBe('-');
  });

  it('recalcula o acumulado do zero quando um lançamento antigo é corrigido', async () => {
    // CT-201: corrigir março corrige setembro sem ação extra. Se alguém gravar
    // o acumulado numa tabela, é este teste que quebra.
    const corrigido = [
      lancamentoDeProducao('l-1', SERVICO_FRESA_CAPA, '2026-03-09', '900'),
      lancamentoDeProducao('l-2', SERVICO_FRESA_CAPA, '2026-09-03', '234,5'),
    ];
    const rdo = await montaOuFalha('2026-09-03', { producao: corrigido });
    expect(linhaDe(rdo.producao, 'REC.(FRESA+CAPA)').acumuladoTexto).toBe('1.134,50');
  });

  it('soma decimal sem erro de ponto flutuante', async () => {
    // CT-204, R6: 0,1 + 0,2 em binário dá 0,30000000000000004.
    const rdo = await montaOuFalha('2026-09-02', {
      producao: [
        lancamentoDeProducao('l-4', SERVICO_RECICLAGEM, '2026-09-01', '0,1'),
        lancamentoDeProducao('l-5', SERVICO_RECICLAGEM, '2026-09-02', '0,2'),
      ],
    });
    expect(linhaDe(rdo.producao, 'RECICLAGEM(BASE+CAPA)').acumuladoTexto).toBe('0,30');
  });
});

describe('acumulado contra a quantidade de projeto (caso obrigatório 6)', () => {
  it('avisa, sem bloquear, quando o acumulado passa do projeto', async () => {
    // CT-202: percentual real acima de 100% é informação, não erro; travar o
    // RDO impediria a medição de um aditivo.
    const rdo = await montaOuFalha('2026-09-04', {
      producao: [
        ...PRODUCAO_PADRAO,
        lancamentoDeProducao('l-6', SERVICO_FRESA_CAPA, '2026-09-04', '1065,5'),
      ],
    });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.acumuladoTexto).toBe('2.300,00');
    expect(linha.percentualTexto).toBe('104,05%');
    expect(linha.acumuladoAcimaDoProjeto).toBe(true);
    expect(rdo.avisos.map((a) => a.codigo)).toContain('ACUMULADO_ACIMA_DO_PROJETO');
  });

  it('não avisa quando o acumulado é exatamente igual ao projeto', async () => {
    // CT-203, fronteira: igual não é acima. Um `>=` faria todo serviço
    // concluído nascer marcado como estourado.
    const rdo = await montaOuFalha('2026-09-04', {
      producao: [
        lancamentoDeProducao('l-7', SERVICO_FRESA_CAPA, '2026-09-04', '2210,392'),
      ],
    });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.percentualTexto).toBe('100,00%');
    expect(linha.acumuladoAcimaDoProjeto).toBe(false);
    expect(rdo.avisos.map((a) => a.codigo)).not.toContain('ACUMULADO_ACIMA_DO_PROJETO');
  });

  it('avisa quando o acumulado passa do projeto por um milésimo', async () => {
    // Fronteira de cima, um passo além de CT-203.
    const linhas = calculaProducaoControlada(
      SERVICOS_PADRAO,
      [lancamentoDeProducao('l-8', SERVICO_FRESA_CAPA, '2026-09-04', '2210,393')],
      dia('2026-09-04'),
    );
    expect(linhaDe(linhas, 'REC.(FRESA+CAPA)').acumuladoAcimaDoProjeto).toBe(true);
  });
});

describe('casamento do serviço por referência, nunca por texto (R5)', () => {
  it('mantém o acumulado depois de o serviço ser renomeado', async () => {
    // CT-205: na planilha, renomear o serviço zeraria a coluna inteira.
    const renomeado = SERVICOS_PADRAO.map((s) =>
      s.servicoId === SERVICO_FRESA_CAPA ? { ...s, nome: 'REC. (FRESA+CAPA)' } : s,
    );
    const rdo = await montaOuFalha('2026-09-03', {
      servicos: renomeado,
      producao: PRODUCAO_PADRAO,
    });
    expect(linhaDe(rdo.producao, 'REC. (FRESA+CAPA)').acumuladoTexto).toBe('1.234,50');
  });
});

describe('rastreabilidade do bloco 7 (CT-232)', () => {
  it('leva cada acumulado de volta aos lançamentos que o compõem', async () => {
    const rdo = await montaOuFalha('2026-09-03', { producao: PRODUCAO_PADRAO });
    const linha = linhaDe(rdo.producao, 'REC.(FRESA+CAPA)');
    expect(linha.lancamentosDoAcumulado).toEqual(['l-1', 'l-2']);
  });

  it('não carrega autor de lançamento nenhum no bloco de produção', async () => {
    // Decisão 14.0: a autoria é consulta própria, visível só ao engenheiro.
    const rdo = await montaOuFalha('2026-09-03', { producao: PRODUCAO_PADRAO });
    expect(JSON.stringify(rdo.producao)).not.toContain('autor');
  });
});
