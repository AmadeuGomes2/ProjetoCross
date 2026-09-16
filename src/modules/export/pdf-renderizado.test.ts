/**
 * Fidelidade do PDF **depois de paginado**, conferida no arquivo gerado.
 *
 * Origem das expectativas: `.claude/skills/fidelidade-documento/SKILL.md` —
 * blocos 5, 7, 10 e 11, e a decisão 11.1 ("o dia que transborda o layout ganha
 * uma segunda página de continuação, **com o mesmo cabeçalho de
 * identificação**"). Os limites de volume são os herdados do layout, na skill
 * `regras-rdo`, seção 6: 15 atividades, 4 linhas de comentário, 41 colunas de
 * função e 41 de equipamento.
 *
 * Por que este arquivo existe, separado de `pdf-fidelidade.test.ts`: aquele lê
 * a árvore de elementos, que é cega para tudo que só acontece na paginação. O
 * laudo `docs/fidelidade/2026-09-16-rdo-diario.md` achou, no papel, três coisas
 * que a árvore jurava estarem certas — uma página órfã sem identificação, um
 * rótulo hifenizado no meio e uma barra fora do lugar. Aqui se renderiza o PDF
 * de verdade e se lê o que foi pintado, com posição.
 *
 * Nenhum arquivo é escrito em disco: `renderToBuffer` devolve os bytes.
 */

import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';

import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { ROTULO } from './documento/rotulos';
import type {
  CelulaDeEfetivo,
  LinhaDeAtividadeNoPapel,
  RdoParaDocumento,
} from './portas';
import { lePdf, textosDaPaginaDoPdf, type PdfLido } from './teste/leitura-de-pdf';
import { RDO_DE_EXEMPLO } from './teste/duplas';

/** A4 retrato, em pontos. Nada pintado fora daqui chega ao fiscal. */
const LARGURA_A4 = 595.28;
const ALTURA_A4 = 841.89;

/**
 * Funções de nome longo, sintéticas. Nome de função não é dado de pessoa, mas
 * é o que estoura a coluna de 40pt do bloco 5 — o volume de fronteira precisa
 * de rótulo realista, não de `Funcao 1`.
 */
const FUNCOES_LONGAS = [
  'Tecnico de Seguranca do Trabalho',
  'Motorista de Caminhao Basculante',
  'Operador de Rolo Compactador',
  'Apontador de Producao e Medicao',
  'Encarregado de Obra',
  'Servente',
] as const;

function colunasDeFuncao(quantidade: number, de = 1): CelulaDeEfetivo[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    chave: `f-${de + i}`,
    rotulo: FUNCOES_LONGAS[(de + i) % FUNCOES_LONGAS.length] ?? 'Servente',
    quantidade: '2',
  }));
}

function colunasDeEquipamento(quantidade: number): CelulaDeEfetivo[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    chave: `e-${i + 1}`,
    rotulo: `CF-${i + 10}`,
    quantidade: '1',
  }));
}

function atividadesLongas(quantidade: number, de = 1): LinhaDeAtividadeNoPapel[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    chave: `a-${de + i}`,
    descricao: `Fresagem e recomposicao de capa asfaltica na Rua Projetada ${de + i}, entre as estacas 10 e 25`,
    status: 'Produção',
  }));
}

/** O volume que o layout promete aguentar na página 1, todo de uma vez. */
function rdoNoVolumeDeFronteira(): RdoParaDocumento {
  return {
    ...RDO_DE_EXEMPLO,
    efetivoPessoal: {
      pagina1: colunasDeFuncao(41),
      continuacao: [],
      total: '82',
    },
    efetivoEquipamentos: {
      pagina1: colunasDeEquipamento(41),
      continuacao: [],
      total: '41',
    },
    atividades: { pagina1: atividadesLongas(15), continuacao: [] },
    comentariosCros: {
      pagina1: [
        'Frente liberada pela fiscalizacao no trecho da Avenida Central, sem pendencia',
        'Equipe de sinalizacao mobilizada a partir das 13h, com apoio de dois agentes',
        'Caminhao basculante CF-12 em manutencao corretiva, substituido pelo CF-19',
        'Concretagem do meio-fio adiada por excesso de umidade no subleito do trecho',
      ],
      continuacao: [],
    },
  };
}

async function gera(rdo: RdoParaDocumento): Promise<PdfLido> {
  return lePdf(await renderToBuffer(montaDocumentoDoRdo(rdo)));
}

describe('rótulo do bloco 10 inteiro (gabarito, bloco 10)', () => {
  it('imprime COMENTÁRIO CONTRATANTE numa linha só', async () => {
    // O gabarito manda o rótulo `COMENTÁRIO CONTRATANTE`, singular. Uma linha
    // com o rótulo inteiro é um trecho de texto só; partido, seriam dois.
    const pdf = await gera(RDO_DE_EXEMPLO);
    expect(textosDaPaginaDoPdf(pdf, 1)).toContain(ROTULO.COMENTARIO_CONTRATANTE);
  });

  it('imprime o comentário da CROS dentro da área da página', async () => {
    // O bloco 10 existe para ser lido. Texto pintado fora do papel é bloco
    // ausente, que é falha CRÍTICA na tabela de gravidade do gabarito.
    const pdf = await gera(RDO_DE_EXEMPLO);
    const comentario = pdf.paginas[0]?.trechos.find(
      (trecho) => trecho.texto === 'Frente liberada',
    );
    expect(comentario).toBeDefined();
    expect(comentario?.x).toBeGreaterThan(0);
    expect(comentario?.x).toBeLessThan(LARGURA_A4);
    expect(comentario?.y).toBeGreaterThan(0);
    expect(comentario?.y).toBeLessThan(ALTURA_A4);
  });
});

describe('hifenização desligada (gabarito, blocos 5 e 10)', () => {
  /** Hífen colado numa letra no fim de uma linha só aparece por hifenização. */
  function trechosComHifenInserido(pdf: PdfLido): string[] {
    return pdf.paginas.flatMap((pagina) =>
      pagina.trechos
        .map((trecho) => trecho.texto)
        .filter((texto) => /\p{L}-$/u.test(texto)),
    );
  }

  it('não parte nome de função no meio da palavra', async () => {
    const pdf = await gera({
      ...RDO_DE_EXEMPLO,
      efetivoPessoal: { pagina1: colunasDeFuncao(6), continuacao: [], total: '12' },
    });
    expect(trechosComHifenInserido(pdf)).toEqual([]);
  });

  it('não parte texto livre de comentário no meio da palavra', async () => {
    const pdf = await gera({
      ...RDO_DE_EXEMPLO,
      comentariosCros: {
        pagina1: rdoNoVolumeDeFronteira().comentariosCros.pagina1,
        continuacao: [],
      },
    });
    expect(trechosComHifenInserido(pdf)).toEqual([]);
  });
});

describe('volume de fronteira da página 1 (regras-rdo §6, decisão 11.1)', () => {
  it('imprime 41 funções, 41 equipamentos, 15 atividades e 4 comentários numa página só', async () => {
    // O limite declarado tem que ser o limite real: dentro dele, o documento é
    // de uma página. Segunda página antes da hora é divergência tanto quanto
    // truncar.
    const pdf = await gera(rdoNoVolumeDeFronteira());
    expect(pdf.paginas).toHaveLength(1);
  }, 30000);

  it('mantém todas as 41 colunas e as 15 atividades no papel', async () => {
    const pdf = await gera(rdoNoVolumeDeFronteira());
    const textos = textosDaPaginaDoPdf(pdf, 1);
    expect(textos).toContain('CF-50');
    expect(textos.join(' ')).toContain('Rua Projetada 15');
    expect(textos[textos.indexOf(ROTULO.TOTAL) + 1]).toBe('82');
  }, 30000);

  it('dá cabeçalho de identificação a toda página, mesmo passando do que o papel aguenta', async () => {
    // Decisão 11.1: a página que nasce do transbordo traz o mesmo cabeçalho de
    // identificação. Uma folha com assinaturas e nada que diga de que dia ela é
    // não é RDO. Aqui o volume passa do limite de propósito.
    const pdf = await gera({
      ...RDO_DE_EXEMPLO,
      efetivoPessoal: {
        pagina1: colunasDeFuncao(120),
        continuacao: [],
        total: '240',
      },
      atividades: { pagina1: atividadesLongas(15), continuacao: [] },
    });
    expect(pdf.paginas.length).toBeGreaterThan(1);
    for (let numero = 1; numero <= pdf.paginas.length; numero += 1) {
      const textos = textosDaPaginaDoPdf(pdf, numero);
      expect(textos).toContain(RDO_DE_EXEMPLO.identificacao.data);
      expect(textos).toContain(ROTULO.NUMERO_DO_RDO);
      expect(textos).toContain(ROTULO.TITULO);
    }
  }, 30000);
});

describe('continuação declarada (decisão 11.1)', () => {
  function rdoComContinuacao(): RdoParaDocumento {
    return {
      ...RDO_DE_EXEMPLO,
      atividades: {
        pagina1: atividadesLongas(15),
        continuacao: atividadesLongas(2, 16),
      },
      temContinuacao: true,
    };
  }

  it('põe título, data, RDO Nº e a marca de continuação na página 2 do PDF gerado', async () => {
    const pdf = await gera(rdoComContinuacao());
    expect(pdf.paginas).toHaveLength(2);
    const pagina2 = textosDaPaginaDoPdf(pdf, 2);
    expect(pagina2).toContain(ROTULO.TITULO);
    expect(pagina2).toContain(RDO_DE_EXEMPLO.identificacao.data);
    expect(pagina2).toContain(ROTULO.NUMERO_DO_RDO);
    expect(pagina2).toContain(ROTULO.CONTINUACAO);
  }, 30000);

  it('não marca a página 1 como continuação', async () => {
    const pdf = await gera(rdoComContinuacao());
    expect(textosDaPaginaDoPdf(pdf, 1)).not.toContain(ROTULO.CONTINUACAO);
  }, 30000);

  it('imprime o título uma vez por página, e não duas', async () => {
    // O cabeçalho preso ao alto da página repete a cada folha; repetir duas
    // vezes na mesma folha seria o efeito colateral natural do `fixed`.
    const pdf = await gera(rdoComContinuacao());
    for (let numero = 1; numero <= pdf.paginas.length; numero += 1) {
      const titulos = textosDaPaginaDoPdf(pdf, numero).filter(
        (texto) => texto === ROTULO.TITULO,
      );
      expect(titulos).toHaveLength(1);
    }
  }, 30000);

  it('não repete o bloco do contratante na continuação', async () => {
    // O gabarito tem uma ocorrência do bloco 10 por RDO, e na v1 ela sai vazia
    // (decisão 10.1). Repetir o quadro vazio na folha de continuação inventa um
    // bloco que o documento não tem.
    const pdf = await gera({
      ...RDO_DE_EXEMPLO,
      comentariosCros: {
        pagina1: ['linha 1', 'linha 2', 'linha 3', 'linha 4'],
        continuacao: ['linha 5'],
      },
      temContinuacao: true,
    });
    const pagina2 = textosDaPaginaDoPdf(pdf, 2);
    expect(pagina2).toContain(ROTULO.COMENTARIOS_CROS);
    expect(pagina2).toContain('linha 5');
    expect(pagina2).not.toContain(ROTULO.COMENTARIO_CONTRATANTE);
  }, 30000);
});

describe('barra de percentual atrás do número (gabarito, bloco 7)', () => {
  it('desenha a barra na mesma faixa vertical do número', async () => {
    // Conferido no XML da planilha em 16/09/2026: a regra de barra de dados não
    // traz `showValue="0"`, então o Excel desenha a barra **atrás** do número,
    // na mesma célula. Barra embaixo do número é outra coisa.
    const pdf = await gera(RDO_DE_EXEMPLO);
    const pagina = pdf.paginas[0];
    expect(pagina).toBeDefined();
    const numero = pagina?.trechos.find((trecho) => trecho.texto === '55,85%');
    const barra = pagina?.retangulos.find((retangulo) =>
      retangulo.cor.startsWith('0.4627'),
    );
    expect(numero).toBeDefined();
    expect(barra).toBeDefined();
    if (numero === undefined || barra === undefined) return;
    const topo = Math.max(barra.y, barra.y + barra.altura);
    const base = Math.min(barra.y, barra.y + barra.altura);
    expect(numero.y).toBeGreaterThanOrEqual(base - 1);
    expect(numero.y).toBeLessThanOrEqual(topo + 1);
  });
});

describe('assinaturas lado a lado (gabarito, bloco 11)', () => {
  it('alinha os dois rótulos de assinatura na mesma altura', async () => {
    const pdf = await gera(RDO_DE_EXEMPLO);
    const trechos = pdf.paginas[0]?.trechos ?? [];
    const cros = trechos.find((t) => t.texto === ROTULO.REPRESENTANTE_CROS);
    const contratante = trechos.find((t) => t.texto === ROTULO.REPRESENTANTE_CONTRATANTE);
    expect(cros).toBeDefined();
    expect(contratante).toBeDefined();
    expect(Math.abs((cros?.y ?? 0) - (contratante?.y ?? 0))).toBeLessThanOrEqual(1);
  });
});
