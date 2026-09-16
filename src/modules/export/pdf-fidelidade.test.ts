/**
 * CT-247 a CT-259 — fidelidade dos valores no PDF.
 * Casos em `docs/qa/v1-casos-passo-6.md`, funcionalidade F6.2 do PRD.
 *
 * Origem das expectativas: `.claude/skills/fidelidade-documento/SKILL.md`.
 * Gravidade CRÍTICA no gabarito: número com separador errado, data em `mm/dd`,
 * nome de trabalhador aparecendo, bloco lendo a fonte errada.
 *
 * Duas convenções diferentes de zero convivem no mesmo documento, e é fácil
 * uniformizar por engano: **zero de efetivo é branco, zero de produção é
 * traço**, e o **percentual continua numérico** mesmo com produção zero.
 */

import { describe, expect, it } from 'vitest';

import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { ROTULO } from './documento/rotulos';
import { coletaTextos, metadadosDoDocumento, textoDoDocumento } from './teste/arvore';
import { RDO_DE_EXEMPLO } from './teste/duplas';
import type { RdoParaDocumento } from './portas';

function seguinteDe(textos: readonly string[], rotulo: string): string {
  const i = textos.indexOf(rotulo);
  if (i < 0) throw new Error(`rótulo ausente no documento: ${rotulo}`);
  return textos[i + 1] ?? '';
}

describe('data e dia da semana (CT-247)', () => {
  it('imprime dd/mm/aaaa e o dia da semana capitalizado', () => {
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).toContain('03/09/2026');
    expect(texto).toContain('Quinta-Feira');
    expect(texto).not.toContain('09/03/2026');
  });
});

describe('números do bloco 7 (CT-248, CT-249, CT-259)', () => {
  it('usa ponto de milhar e vírgula decimal', () => {
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).toContain('15.027,03');
    expect(texto).not.toContain('15,027.03');
  });

  it('imprime traço nas duas colunas do serviço sem lançamento', () => {
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const inicio = textos.indexOf('RECICLAGEM(BASE+CAPA)');
    expect(textos.slice(inicio + 1, inicio + 3)).toEqual(['-', '-']);
  });

  it('imprime o percentual como número, e não como traço, com produção zero', () => {
    // CT-259: a 17.2 fala em produção zero e vale para EXEC. e ACUM.; estender
    // o traço à quarta coluna é o deslize natural.
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const inicio = textos.indexOf('RECICLAGEM(BASE+CAPA)');
    expect(textos[inicio + 4]).toBe('0,00%');
  });
});

describe('efetivo no papel (CT-250, CT-251)', () => {
  it('mantém a coluna da função sem ninguém, com a quantidade em branco', () => {
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(textos).toContain('Topografo');
    expect(seguinteDe(textos, 'Topografo')).not.toBe('0');
  });

  it('não imprime nome de trabalhador, e imprime a função com a quantidade', () => {
    // CT-251, CRÍTICO: o RDO agrega por função, nunca por nome.
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(textos.join('\n')).not.toContain('P1');
    expect(seguinteDe(textos, 'Motorista')).toBe('2');
  });
});

describe('metadados do PDF (CT-252)', () => {
  it('não põe nome de pessoa em autor, título, assunto nem palavras-chave', () => {
    const metadados = metadadosDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(metadados.author).toBe('RDO digital');
    expect(metadados.title).toBe('RDO 210 — 03/09/2026');
    expect(metadados.subject).toBe('P0476/01-25 - BLOCO 02');
    expect(metadados.keywords).toBe('');
    const tudo = Object.values(metadados).join(' ');
    expect(tudo).not.toContain('R1');
    expect(tudo).not.toContain('P1');
  });
});

describe('assinaturas, bloco 11 (CT-254)', () => {
  it('mostra nome, titulação e registro do responsável técnico', () => {
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).toContain('R1');
    expect(texto).toContain('Engenheiro Civil');
    expect(texto).toContain('CREA - MG 000000/D');
  });

  it('mantém os dois rótulos quando a obra ainda não tem responsável técnico', () => {
    const semResponsavel: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      responsavelTecnico: null,
    };
    const texto = textoDoDocumento(montaDocumentoDoRdo(semResponsavel));
    expect(texto).toContain(ROTULO.REPRESENTANTE_CROS);
    expect(texto).toContain(ROTULO.REPRESENTANTE_CONTRATANTE);
  });
});

describe('textos fixos (CT-255)', () => {
  it('preserva o espaço duplo do meio, que é do original', () => {
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).toContain('SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02');
    expect(texto).toContain('VIAS URBANAS  DA CIDADE MONTES CLAROS - MG');
  });
});

describe('comentários, cada bloco da sua fonte (CT-256)', () => {
  it('imprime a observação sob COMENTÁRIOS CROS e não sob o bloco do contratante', () => {
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const cros = textos.indexOf(ROTULO.COMENTARIOS_CROS);
    const contratante = textos.indexOf(ROTULO.COMENTARIO_CONTRATANTE);
    const observacao = textos.indexOf('Frente liberada');
    expect(cros).toBeGreaterThanOrEqual(0);
    expect(observacao).toBeGreaterThan(cros);
    expect(observacao).toBeLessThan(contratante);
  });

  it('imprime o bloco do contratante com o rótulo e sem conteúdo', () => {
    // CT-228 no papel, decisão 10.1: bloco ausente é falha crítica; bloco
    // vazio, não.
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const contratante = textos.indexOf(ROTULO.COMENTARIO_CONTRATANTE);
    expect(textos.slice(contratante + 1)).not.toContain('Frente liberada');
  });
});

describe('pluviometria no papel (CT-257)', () => {
  it('imprime a letra de cada turno e o índice, inclusive zero', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      pluviometria: { noiteAnterior: 'B', manha: 'B', tarde: 'B', indice: '0 mm' },
    };
    const textos = coletaTextos(montaDocumentoDoRdo(doc));
    expect(seguinteDe(textos, ROTULO.NOITE_ANTERIOR)).toBe('B');
    expect(seguinteDe(textos, ROTULO.MANHA)).toBe('B');
    expect(seguinteDe(textos, ROTULO.TARDE)).toBe('B');
    expect(seguinteDe(textos, ROTULO.INDICE)).toBe('0 mm');
  });

  it('deixa o turno em branco em branco, sem traço e sem zero', () => {
    const doc: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      pluviometria: { noiteAnterior: 'B', manha: 'B', tarde: '', indice: '' },
    };
    const textos = coletaTextos(montaDocumentoDoRdo(doc));
    expect(seguinteDe(textos, ROTULO.TARDE)).toBe(ROTULO.INDICE);
  });
});

describe('dia parado no papel (CT-258)', () => {
  it('imprime o motivo na primeira linha de ATIVIDADES e zera o efetivo', () => {
    const parado: RdoParaDocumento = {
      ...RDO_DE_EXEMPLO,
      atividades: {
        pagina1: [{ chave: 'motivo', descricao: 'Domingo', status: '' }],
        continuacao: [],
      },
      efetivoPessoal: {
        pagina1: [
          { chave: 'f-1', rotulo: 'Motorista', quantidade: '' },
          { chave: 'f-2', rotulo: 'Topografo', quantidade: '' },
        ],
        continuacao: [],
        total: '0',
      },
    };
    const textos = coletaTextos(montaDocumentoDoRdo(parado));
    expect(seguinteDe(textos, ROTULO.STATUS)).toBe('Domingo');
    expect(seguinteDe(textos, 'Motorista')).toBe('Topografo');
    expect(seguinteDe(textos, ROTULO.TOTAL)).toBe('0');
  });
});
