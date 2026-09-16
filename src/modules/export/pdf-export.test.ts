/**
 * CT-237 a CT-246 — exportar o RDO diário em PDF.
 * Casos em `docs/qa/v1-casos-passo-6.md`, funcionalidade F6.1 do PRD.
 *
 * Origem das expectativas: a skill `fidelidade-documento`, que é o gabarito do
 * documento, mais R19 (perfil), R20 (exportação é ato registrado) e CLAUDE.md,
 * seção Segurança.
 *
 * A ordem dos 11 blocos é obrigatória: é a ordem em que o fiscal lê. Um
 * documento que não parece um RDO gera pedido de correção e atrasa medição.
 */

import { describe, expect, it } from 'vitest';

import { diaPuroConfiavel } from '../../shared/date/dia';
import { CODIGO_ERRO, erro, erroDeDominio } from '../../shared/result';
import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { ROTULO } from './documento/rotulos';
import { exportaRdoDiarioEmPdf } from './exporta-rdo-diario-em-pdf';
import { coletaTextos, textoDoDocumento } from './teste/arvore';
import {
  criaPortasDoExport,
  ENCARREGADO,
  ENGENHEIRO,
  MOMENTO,
  OBRA,
  RDO_DE_EXEMPLO,
} from './teste/duplas';

const DIA = diaPuroConfiavel('2026-09-03');

describe('os 11 blocos, na ordem do gabarito (CT-237)', () => {
  it('imprime os blocos na ordem em que o fiscal lê', () => {
    const textos = coletaTextos(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const posicaoDe = (rotulo: string): number => {
      const i = textos.indexOf(rotulo);
      if (i < 0) throw new Error(`bloco ausente no documento: ${rotulo}`);
      return i;
    };

    const ordem = [
      ROTULO.TITULO,
      ROTULO.BMS,
      ROTULO.INFORMACOES_GERAIS,
      ROTULO.CARACTERISTICAS,
      ROTULO.EFETIVO_PESSOAL,
      ROTULO.EFETIVO_EQUIPAMENTOS,
      ROTULO.PRODUCAO_CONTROLADA,
      ROTULO.ATIVIDADES,
      ROTULO.PLUVIOMETRIA,
      ROTULO.COMENTARIOS_CROS,
      ROTULO.REPRESENTANTE_CROS,
    ].map(posicaoDe);

    expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
  });

  it('usa os rótulos com a grafia herdada, erros de ortografia inclusive', () => {
    // CT-238. "Corrigir" DATA INICIO ou CARACTERISTICAS é divergência.
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    for (const rotulo of [
      'RELATÓRIO DIÁRIO DE OBRAS',
      "BM'S",
      'RDO Nº',
      'DATA INICIO',
      'CARACTERISTICAS DO PROJETO',
      'EFETIVO EQUIPAMENTOS',
      'EXEC.',
      'ACUM.',
      'NOITE ANTER',
      'INDICE',
      'COMENTÁRIOS CROS',
      'COMENTÁRIO CONTRATANTE',
      'REPRESENTANTE CROS CONSTRUÇÕES S/A',
      'REPRESENTANTE CONTRATANTE',
    ]) {
      expect(texto).toContain(rotulo);
    }
  });

  it('não leva o resumo do dia para o papel', () => {
    // CT-239, decisão 3.3: o gabarito impresso não tem esse campo, e o RDO de
    // exemplo tem chuva com 12 mm, que na tela seria "Perca de produção".
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).not.toContain('Perca de produção');
    expect(texto).not.toContain('Trabalhado');
    expect(texto).not.toContain('Impraticavél');
    expect(texto).toContain('12 mm');
  });

  it('não leva aviso de tela para o papel', () => {
    const texto = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(texto).not.toContain('aviso');
    expect(texto).not.toContain('período de BMS');
  });
});

describe('exportação do engenheiro (CT-240 a CT-242)', () => {
  it('devolve os bytes de um PDF e o nome do arquivo', async () => {
    const espia = criaPortasDoExport();
    const r = await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.nomeDoArquivo).toBe('rdo-2026-09-03-n210.pdf');
    // `%PDF` é a assinatura do formato: sem ela não é PDF nenhum.
    expect(Buffer.from(r.valor.bytes.subarray(0, 4)).toString('latin1')).toBe('%PDF');
  });

  it('registra a exportação com id do usuário, momento, obra e dia', async () => {
    // CT-242, R20.
    const espia = criaPortasDoExport();
    await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);

    expect(espia.registros).toEqual([
      {
        obraId: OBRA,
        usuarioId: ENGENHEIRO.usuarioId,
        momento: MOMENTO,
        dataRdo: DIA,
        formato: 'PDF',
      },
    ]);
  });

  it('guarda id na trilha, e nunca nome de pessoa', async () => {
    // CT-246: a trilha é permanente e nunca apagada.
    const espia = criaPortasDoExport();
    await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);
    expect(JSON.stringify(espia.registros)).not.toContain('nome');
  });

  it('produz o mesmo documento em duas exportações seguidas', async () => {
    // CT-241: duas versões diferentes do mesmo dia nas mãos do fiscal é o pior
    // defeito possível. O conteúdo não pode depender do relógio nem da ordem de
    // leitura do banco.
    const primeira = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    const segunda = textoDoDocumento(montaDocumentoDoRdo(RDO_DE_EXEMPLO));
    expect(segunda).toBe(primeira);
  });
});

describe('recusas (CT-243 a CT-245)', () => {
  it('recusa a exportação pedida pelo encarregado, sem deixar registro', async () => {
    // CT-243, R19: quem entrega o documento ao fiscal é o engenheiro, e a
    // recusa não pode deixar registro fantasma na trilha.
    const espia = criaPortasDoExport();
    const r = await exportaRdoDiarioEmPdf(OBRA, DIA, ENCARREGADO, espia.portas);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(espia.registros).toHaveLength(0);
  });

  it('não gera PDF quando a montagem do RDO é recusada', async () => {
    // CT-244: a data inexistente é recusada antes, na borda do `rdo`; aqui o
    // que se garante é que o erro sobe e nenhum arquivo nasce.
    const espia = criaPortasDoExport(RDO_DE_EXEMPLO, () =>
      Promise.resolve(
        erro(
          erroDeDominio(
            CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA,
            'A data está fora do período do contrato.',
          ),
        ),
      ),
    );
    const r = await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);

    expect(r.ok).toBe(false);
    expect(espia.registros).toHaveLength(0);
  });

  it('não vaza detalhe técnico quando a geração falha', async () => {
    // CT-245: a geração lê pessoal, responsável técnico e observações; é o
    // caminho com mais dado pessoal em memória do sistema inteiro.
    const espia = criaPortasDoExport(RDO_DE_EXEMPLO, () => {
      throw new Error('conexão perdida ao ler o cadastro');
    });
    const r = await exportaRdoDiarioEmPdf(OBRA, DIA, ENGENHEIRO, espia.portas);

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.mensagem).not.toContain('conexão perdida');
      expect(r.erro.mensagem).toMatch(/cite o código [0-9a-f]{8}/);
    }
    expect(espia.registros).toHaveLength(0);
  });
});
