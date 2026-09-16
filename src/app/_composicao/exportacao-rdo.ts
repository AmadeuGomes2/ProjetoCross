/**
 * Raiz de composição da exportação em PDF. **A trilha está ligada.**
 *
 * Aqui acontece a conferência das duas pontas do contrato: `rdo` produz um
 * `RdoParaDocumento` e `export` declara um tipo igual, por estrutura. Se as
 * duas definições divergirem, **este arquivo deixa de compilar** — que é
 * exatamente onde a divergência deve doer, e não no papel do fiscal.
 *
 * `registraExportacao` grava em `registro_exportacao` (R20). Enquanto estava
 * pendente ela recusava com `NAO_ENCONTRADO`, e esse código teria virado 404
 * numa rota: o engenheiro leria "RDO não existe" para um problema de banco.
 * Agora a recusa é `FALHA_INESPERADA`, que a rota traduz em 500.
 *
 * A ordem do módulo `export` não muda: perfil, montagem, bytes e **trilha
 * antes de entregar**. Sem trilha, não há exportação (CT-242, CT-246).
 */

import {
  exportaRdoDiarioEmPdf,
  type ErroDeExportacao,
} from '../../modules/export/exporta-rdo-diario-em-pdf';
import type {
  AtorDaExportacao,
  PortasDoExport,
  RdoParaDocumento,
} from '../../modules/export/portas';
import { registraExportacaoNoBanco } from '../../modules/export/repositorio';
import { paraDocumento } from '../../modules/rdo/para-documento';
import { montaRdoDiario } from '../../modules/rdo/monta-rdo-diario';
import { criaDiaPuro, type DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import type { ObraId } from '../../shared/id';
import { CODIGO_ERRO, erro, ok } from '../../shared/result';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { criaPortasDoRdo } from './rdo-diario';

export function criaPortasDoExport(
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): PortasDoExport {
  const portasDoRdo = criaPortasDoRdo(ambiente);

  return {
    montaRdo: async (obraId, dia) => {
      // A autorização já correu na rota, por `comAtorNaObra`. Montar de novo
      // aqui é de propósito: o `export` precisa do RDO do mesmo dia, e passar
      // pela mesma montagem garante que o papel e a tela não divergem (R18).
      const montado = await montaRdoDiario(obraId, dia, portasDoRdo);
      if (!montado.ok) return erro(montado.erro);
      // A projeção poda o resumo do dia e os avisos: o que não chega ao
      // `export` não pode vazar para o papel (decisões 3.3 e 12.1).
      const documento: RdoParaDocumento = paraDocumento(montado.valor);
      return ok(documento);
    },
    registraExportacao: async (evento) =>
      registraExportacaoNoBanco(ambiente.cadastro.db, evento),
    agora: () => instanteAgora(ambiente.cadastro.relogio),
  };
}

export function exportaRdo(
  obraId: ObraId,
  dia: DiaPuro,
  ator: AtorDaExportacao,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
) {
  return exportaRdoDiarioEmPdf(obraId, dia, ator, criaPortasDoExport(ambiente));
}

/**
 * A resposta HTTP do PDF.
 *
 * Mora aqui, e não na rota, porque `route.ts` é borda: ela autoriza e delega.
 * A tradução de erro de domínio para status é a parte que merece cuidado —
 * **nenhum erro daqui pode virar 404 por acidente**. "Não deu para gravar a
 * trilha" é falha do servidor (500); "esta data está fora do contrato" é
 * pedido inválido (422); só obra ou dia inexistente é 404.
 *
 * A mensagem devolvida é a do domínio, em português, sem rastro de pilha e sem
 * nome de pessoa (CLAUDE.md, Segurança).
 */
export async function respondeComOPdfDoRdo(
  ator: AtorDaExportacao,
  obraId: ObraId,
  diaBruto: string | string[] | undefined,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Response> {
  if (typeof diaBruto !== 'string') {
    return Response.json({ erro: 'Informe a data do RDO a exportar.' }, { status: 400 });
  }
  const dia = criaDiaPuro(diaBruto);
  if (!dia.ok) {
    return Response.json({ erro: dia.erro.mensagem }, { status: 400 });
  }

  const exportado = await exportaRdo(obraId, dia.valor, ator, ambiente);
  if (!exportado.ok) {
    return Response.json(
      { erro: exportado.erro.mensagem },
      { status: statusDoErro(exportado.erro) },
    );
  }

  // Cópia para um buffer próprio: o corpo de `Response` exige um `ArrayBuffer`
  // e o PDF chega num `Uint8Array` que o compilador não sabe se é compartilhado.
  // Copiar é mais honesto que calar o compilador com `as`, e o custo é o de um
  // documento de uma página.
  const corpo = new Uint8Array(exportado.valor.bytes.byteLength);
  corpo.set(exportado.valor.bytes);

  return new Response(corpo, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      // Nome do arquivo da decisão 17.3: data e número do RDO, sem nome de
      // pessoa. O cabeçalho circula em e-mail e em WhatsApp.
      'content-disposition': `attachment; filename="${exportado.valor.nomeDoArquivo}"`,
      // O RDO muda quando o lançamento muda: nada de cache intermediário.
      'cache-control': 'no-store',
    },
  });
}

function statusDoErro(e: ErroDeExportacao): number {
  if (e.tipo === 'acesso') return 403;
  if (e.tipo === 'entrada') return 400;
  if (e.tipo === 'inesperado' || e.codigo === CODIGO_ERRO.FALHA_INESPERADA) return 500;
  if (e.codigo === CODIGO_ERRO.NAO_ENCONTRADO) return 404;
  return 422;
}
