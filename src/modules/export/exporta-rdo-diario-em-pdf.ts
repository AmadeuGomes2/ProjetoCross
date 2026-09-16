/**
 * Exportar o RDO diário em PDF.
 *
 * Ordem das quatro coisas, e cada uma tem razão:
 *
 * 1. **Perfil.** Só o engenheiro exporta (R19). A verificação da rota
 *    (`exigeAcessoNaObra`, frente A) continua sendo obrigatória; esta aqui é a
 *    segunda camada, porque esconder botão não é controle de acesso e uma rota
 *    nova pode esquecer a primeira. A recusa acontece **antes** de qualquer
 *    outra coisa, para não deixar registro fantasma na trilha (CT-243).
 * 2. **Montar o RDO.** Se o dia não gera documento — data fora do contrato,
 *    obra inexistente —, o erro sobe e nenhum arquivo nasce (CT-244).
 * 3. **Gerar os bytes.**
 * 4. **Registrar a exportação** (R20), **antes** de devolver o arquivo. A linha
 *    guarda id do usuário, momento, obra, dia e formato — id, nunca nome
 *    (CT-242, CT-246). Se o registro falhar, o arquivo não é entregue: sem
 *    trilha, não há exportação.
 *
 * Falha inesperada não vaza detalhe técnico (CT-245): a geração lê pessoal,
 * responsável técnico e observações, e é o caminho com mais dado pessoal em
 * memória do sistema inteiro.
 */

import { renderToBuffer } from '@react-pdf/renderer';

import type { DiaPuro } from '../../shared/date/dia';
import { geraId, type CorrelacaoId, type ObraId } from '../../shared/id';
import { mensagemGenericaDeErro, registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  type CodigoErro,
  erro,
  erroDeDominio,
  ok,
  type Result,
} from '../../shared/result';
import { montaDocumentoDoRdo } from './documento/documento-rdo';
import { nomeDoArquivoDoRdo } from './nome-do-arquivo';
import type { AtorDaExportacao, PortasDoExport } from './portas';

/** Ver a nota em `src/modules/rdo/borda/consulta-rdo.ts`: `shared/result` ainda
 * não tem código para falha inesperada, e criá-lo é mudança em `src/shared/**`. */
export const FALHA_INESPERADA = 'FALHA_INESPERADA';

export interface ErroDeExportacao {
  readonly tipo: 'dominio' | 'entrada' | 'acesso' | 'inesperado';
  readonly codigo: CodigoErro | typeof FALHA_INESPERADA;
  readonly mensagem: string;
}

export interface ArquivoExportado {
  readonly nomeDoArquivo: string;
  readonly bytes: Uint8Array;
}

export async function exportaRdoDiarioEmPdf(
  obraId: ObraId,
  dia: DiaPuro,
  ator: AtorDaExportacao,
  portas: PortasDoExport,
): Promise<Result<ArquivoExportado, ErroDeExportacao>> {
  if (ator.perfil !== 'engenheiro') {
    return erro({
      tipo: 'acesso',
      codigo: CODIGO_ERRO.SEM_PERMISSAO,
      mensagem: 'Só o engenheiro da obra exporta o RDO.',
    });
  }

  try {
    const montado = await portas.montaRdo(obraId, dia);
    if (!montado.ok) return erro(montado.erro);

    const documento = montaDocumentoDoRdo(montado.valor);
    const bytes = new Uint8Array(await renderToBuffer(documento));

    const registro = await portas.registraExportacao({
      obraId,
      usuarioId: ator.usuarioId,
      momento: portas.agora(),
      dataRdo: dia,
      formato: 'PDF',
    });
    if (!registro.ok) {
      return erro(
        erroDeDominio(
          registro.erro.codigo,
          'Não foi possível registrar a exportação, e por isso o arquivo não foi gerado. Tente de novo.',
        ),
      );
    }

    return ok({
      nomeDoArquivo: nomeDoArquivoDoRdo(dia, montado.valor.identificacao.numeroDoRdo),
      bytes,
    });
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    // A causa não vira texto no log: `ContextoDeLog` não tem campo de texto
    // livre, e um erro de driver costuma citar o valor da linha lida.
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error ? `export.pdf_falhou.${causa.name}` : 'export.pdf_falhou',
      { obraId, dia, usuarioId: ator.usuarioId },
    );
    return erro({
      tipo: 'inesperado',
      codigo: FALHA_INESPERADA,
      mensagem: mensagemGenericaDeErro(correlacaoId),
    });
  }
}
