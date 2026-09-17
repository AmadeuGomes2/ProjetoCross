/**
 * Exportar o RDO de período, nos três modos e nos dois formatos.
 *
 * A ordem das quatro coisas é a mesma do diário
 * (`../exporta-rdo-diario-em-pdf.ts`), e cada uma tem a mesma razão:
 *
 * 1. **Perfil.** Só o engenheiro exporta (R19, decisão 27.1; PP-1 do contrato
 *    assume que o consolidado segue a mesma regra). A recusa acontece **antes**
 *    de qualquer outra coisa, para não deixar registro fantasma na trilha.
 * 2. **Montar o pacote.** Se o conjunto não gera documento — dia fora do
 *    contrato, obra inexistente —, o erro sobe e nenhum arquivo nasce.
 * 3. **Gerar os bytes**, PDF ou planilha, do mesmo pacote. É o que garante que
 *    os dois formatos não podem discordar.
 * 4. **Registrar a exportação** (R20), **antes** de devolver o arquivo, com uma
 *    linha por dia do conjunto e um `loteId` comum (contrato, 4.5). Se o
 *    registro falhar, o arquivo não é entregue: sem trilha, não há exportação.
 *
 * **O modo é um parâmetro, e não três funções.** Três funções repetiriam três
 * vezes a verificação de perfil e a regra "sem trilha não há exportação", e a
 * terceira seria a concatenação das outras duas — a terceira cópia é onde a
 * regra se perde (contrato, 4.1).
 *
 * Falha inesperada não vaza detalhe técnico nem nome: o log leva obra, usuário
 * e **a quantidade** de dias, nunca a lista (contrato, seção 8).
 */

import { renderToBuffer } from '@react-pdf/renderer';

import { geraId, type CorrelacaoId } from '../../../shared/id';
import { mensagemGenericaDeErro, registra } from '../../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type Result,
} from '../../../shared/result';
import type { AtorDaExportacao } from '../portas';
import {
  FALHA_INESPERADA,
  type ArquivoExportado,
  type ErroDeExportacao,
} from '../exporta-rdo-diario-em-pdf';
import { montaDocumentoDoPacote } from './documento/documento-do-pacote';
import { montaPlanilhaDoPacote } from './excel/planilha-de-periodo';
import { nomeDoArquivoDoPeriodo } from './nome-do-arquivo-de-periodo';
import type {
  EventoDeExportacaoDePeriodo,
  PacoteParaDocumento,
  PedidoDeExportacaoDePeriodo,
  PortasDoExportDePeriodo,
} from './portas';

async function bytesDo(
  pacote: PacoteParaDocumento,
  formato: PedidoDeExportacaoDePeriodo['formato'],
): Promise<Uint8Array> {
  if (formato === 'XLSX') return montaPlanilhaDoPacote(pacote);
  return new Uint8Array(await renderToBuffer(montaDocumentoDoPacote(pacote)));
}

export async function exportaRdoDePeriodo(
  pedido: PedidoDeExportacaoDePeriodo,
  ator: AtorDaExportacao,
  portas: PortasDoExportDePeriodo,
): Promise<Result<ArquivoExportado, ErroDeExportacao>> {
  if (ator.perfil !== 'engenheiro') {
    return erro({
      tipo: 'acesso',
      codigo: CODIGO_ERRO.SEM_PERMISSAO,
      mensagem: 'Só o engenheiro da obra exporta o RDO.',
    });
  }

  const primeiroDia = pedido.dias[0];
  const ultimoDia = pedido.dias[pedido.dias.length - 1];
  if (primeiroDia === undefined || ultimoDia === undefined) {
    return erro({
      tipo: 'entrada',
      codigo: CODIGO_ERRO.CAMPO_OBRIGATORIO,
      mensagem: 'Escolha ao menos um dia para exportar.',
    });
  }

  try {
    const montado = await portas.montaPacote(pedido.obraId, pedido.dias, pedido.modo);
    if (!montado.ok) return erro(montado.erro);

    const bytes = await bytesDo(montado.valor, pedido.formato);

    const momento = portas.agora();
    const loteId = geraId<'lote_de_exportacao'>();
    const eventos: readonly EventoDeExportacaoDePeriodo[] = pedido.dias.map((dia) => ({
      obraId: pedido.obraId,
      usuarioId: ator.usuarioId,
      momento,
      dia,
      formato: pedido.formato,
      loteId,
    }));

    const registro = await portas.registraExportacao(eventos);
    if (!registro.ok) {
      return erro(
        erroDeDominio(
          registro.erro.codigo,
          'Não foi possível registrar a exportação, e por isso o arquivo não foi gerado. Tente de novo.',
        ),
      );
    }

    return ok({
      nomeDoArquivo: nomeDoArquivoDoPeriodo(primeiroDia, ultimoDia, pedido.formato),
      bytes,
    });
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    // A causa não vira texto no log: `ContextoDeLog` não tem campo de texto
    // livre, e um erro de driver costuma citar o valor da linha lida.
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error
        ? `export.periodo_falhou.${causa.name}`
        : 'export.periodo_falhou',
      {
        obraId: pedido.obraId,
        usuarioId: ator.usuarioId,
        quantidade: pedido.dias.length,
      },
    );
    return erro({
      tipo: 'inesperado',
      codigo: FALHA_INESPERADA,
      mensagem: mensagemGenericaDeErro(correlacaoId),
    });
  }
}
