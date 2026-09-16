/**
 * Raiz de composição da exportação em PDF.
 *
 * Aqui acontece a conferência das duas pontas do contrato: `rdo` produz um
 * `RdoParaDocumento` e `export` declara um tipo igual, por estrutura. Se as
 * duas definições divergirem, **este arquivo deixa de compilar** — que é
 * exatamente onde a divergência deve doer, e não no papel do fiscal.
 *
 * `registraExportacao` continua pendente: a tabela `registro_exportacao` já
 * existe (migration 0000), mas escrever o repositório exige decidir se o acesso
 * ao banco a partir de uma rota do App Router precisa de configuração em
 * `next.config.ts`, que é arquivo compartilhado. Enquanto a porta não é ligada,
 * ela **recusa**, e a exportação não entrega arquivo sem trilha (R20).
 */

import { exportaRdoDiarioEmPdf } from '../../modules/export/exporta-rdo-diario-em-pdf';
import type {
  AtorDaExportacao,
  PortasDoExport,
  RdoParaDocumento,
} from '../../modules/export/portas';
import { paraDocumento } from '../../modules/rdo/para-documento';
import type { DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import type { ObraId } from '../../shared/id';
import { CODIGO_ERRO, erro, erroDeDominio, ok } from '../../shared/result';
import { consultaRdoDaObra } from './rdo-diario';

export const portasDoExport: PortasDoExport = {
  montaRdo: async (obraId, dia) => {
    const montado = await consultaRdoDaObra({ obraId, dia });
    if (!montado.ok) {
      return erro(
        erroDeDominio(
          montado.erro.codigo === CODIGO_ERRO.NAO_ENCONTRADO
            ? CODIGO_ERRO.NAO_ENCONTRADO
            : CODIGO_ERRO.DATA_FORA_DO_PERIODO_DA_OBRA,
          montado.erro.mensagem,
        ),
      );
    }
    // A projeção poda o resumo do dia e os avisos: o que não chega ao `export`
    // não pode vazar para o papel (decisões 3.3 e 12.1).
    const documento: RdoParaDocumento = paraDocumento(montado.valor);
    return ok(documento);
  },
  registraExportacao: () =>
    Promise.resolve(
      erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'A trilha de exportação ainda não está disponível nesta instalação.',
        ),
      ),
    ),
  agora: () => instanteAgora(),
};

export function exportaRdo(obraId: ObraId, dia: DiaPuro, ator: AtorDaExportacao) {
  return exportaRdoDiarioEmPdf(obraId, dia, ator, portasDoExport);
}
