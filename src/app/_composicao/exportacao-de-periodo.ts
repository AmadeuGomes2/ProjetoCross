/**
 * Raiz de composição da exportação de período. **As portas estão ligadas.**
 *
 * É aqui que as duas pontas se conferem. `rdo/periodo` declara o que produz e
 * `export/periodo` declara o que consome, cada um no seu arquivo, sem que um
 * importe o outro (arquitetura 4.1). Os dois tipos são iguais **por estrutura**,
 * e se deixarem de ser, quem acusa é o `tsc` nesta linha — não o fiscal
 * recebendo um documento torto.
 *
 * Três coisas acontecem, nesta ordem, e a ordem importa:
 *
 * 1. **autoriza**, exigindo engenheiro. O consolidado carrega observação em
 *    texto livre e o registro do responsável técnico;
 * 2. **monta** o pacote conforme o modo pedido;
 * 3. **grava a trilha antes de entregar o arquivo** (R20). Uma linha por dia,
 *    amarradas por `loteId`.
 *
 * O modo `diarios` e o anexo do modo `consolidado-com-diarios` saem do
 * documento **já aprovado**: o anexo é o diário sem uma linha de diferença.
 *
 * **Uma garantia do contrato ainda não está de pé**, e está anotada em
 * `montaPacote`: os anexos deveriam sair do mesmo instantâneo do consolidado, e
 * hoje consultam o banco de novo.
 */

import { exportaRdoDePeriodo } from '../../modules/export/periodo/exporta-rdo-de-periodo';
import type {
  ArquivoExportado,
  ErroDeExportacao,
} from '../../modules/export/exporta-rdo-diario-em-pdf';
import type {
  FormatoDeExportacaoDePeriodo,
  ModoDeExportacaoDePeriodo,
  PacoteParaDocumento,
  PortasDoExportDePeriodo,
} from '../../modules/export/periodo/portas';
import { registraExportacaoDePeriodoNoBanco } from '../../modules/export/repositorio';
import { montaRdoDiario } from '../../modules/rdo/monta-rdo-diario';
import { montaRdoDePeriodo } from '../../modules/rdo/periodo/monta-rdo-de-periodo';
import { paraDocumentoDePeriodo } from '../../modules/rdo/periodo/para-documento-de-periodo';
import { paraDocumento } from '../../modules/rdo/para-documento';
import { criaDiaPuro, type DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import { erro, erroDeDominio, ok, CODIGO_ERRO, type Result } from '../../shared/result';
import type { ObraId } from '../../shared/id';
import type { PortadorDeAcesso } from '../../modules/acesso';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { criaPortasDoRdo } from './rdo-diario';
import { portasDoRdoDePeriodoProtegidas } from './rdo-de-periodo';

export function criaPortasDoExportDePeriodo(
  ator: PortadorDeAcesso,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): PortasDoExportDePeriodo {
  return {
    montaPacote: async (obraId, dias, modo) => {
      const portas = await portasDoRdoDePeriodoProtegidas(ator, obraId, dias, ambiente);
      if (!portas.ok) return erro(portas.erro);

      const consolidado =
        modo === 'diarios' ? null : await montaRdoDePeriodo(obraId, dias, portas.valor);
      if (consolidado !== null && !consolidado.ok) return erro(consolidado.erro);

      const diarios: ReturnType<typeof paraDocumento>[] = [];
      if (modo !== 'consolidado') {
        /*
         * **Divergência declarada do contrato** (`docs/arquitetura/periodo.md`,
         * seção 3): o contrato pede que os diários anexados saiam de portas em
         * memória sobre o mesmo instantâneo do consolidado, e a composição só
         * expõe as portas do período — as do diário ainda consultam o banco.
         *
         * O risco é real e pequeno: um lançamento gravado entre a leitura do
         * instantâneo e a montagem dos anexos faria o anexo discordar do
         * resumo que ele acompanha. Numa obra com um encarregado lançando, a
         * janela é de milissegundos; com dois, deixa de ser desprezível.
         *
         * Fica registrado porque calar seria pior: quem for fechar isso precisa
         * saber que a garantia do contrato ainda não está de pé.
         */
        const portasDoDiario = criaPortasDoRdo(ambiente);
        for (const dia of dias) {
          const montado = await montaRdoDiario(obraId, dia, portasDoDiario);
          if (!montado.ok) return erro(montado.erro);
          diarios.push(paraDocumento(montado.valor));
        }
      }

      if (modo === 'diarios') return ok({ modo, diarios });
      if (consolidado === null || !consolidado.ok) {
        return erro(
          erroDeDominio(
            CODIGO_ERRO.FALHA_INESPERADA,
            'Não foi possível montar o consolidado.',
          ),
        );
      }
      const projetado = paraDocumentoDePeriodo(consolidado.valor);
      return ok(
        modo === 'consolidado'
          ? { modo, consolidado: projetado }
          : { modo, consolidado: projetado, diarios },
      );
    },

    registraExportacao: async (eventos) =>
      registraExportacaoDePeriodoNoBanco(ambiente.cadastro.db, eventos),

    agora: () => instanteAgora(ambiente.cadastro.relogio),
  };
}

export async function exportaPeriodoProtegido(
  ator: PortadorDeAcesso,
  pedido: {
    readonly obraId: ObraId;
    readonly dias: readonly DiaPuro[];
    readonly modo: ModoDeExportacaoDePeriodo;
    readonly formato: FormatoDeExportacaoDePeriodo;
  },
  perfil: 'engenheiro' | 'encarregado',
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Result<ArquivoExportado, ErroDeExportacao>> {
  return exportaRdoDePeriodo(
    pedido,
    { usuarioId: ator.usuarioId, perfil },
    criaPortasDoExportDePeriodo(ator, ambiente),
  );
}

export type { PacoteParaDocumento };

/**
 * A resposta HTTP da exportação de período.
 *
 * Borda: valida a entrada hostil, delega e embrulha. O conjunto de dias chega
 * **no corpo**, não em `?dias=`: uma lista de 30 datas na URL entra em log de
 * servidor, em histórico de navegador e em referrer — e o que se exporta de uma
 * obra é informação sobre ela.
 */
export async function respondeComOPeriodoExportado(
  ator: PortadorDeAcesso,
  perfil: 'engenheiro' | 'encarregado',
  obraId: ObraId,
  corpo: unknown,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Response> {
  const pedido = leiaPedidoDeExportacao(corpo);
  if (!pedido.ok) return Response.json({ erro: pedido.erro }, { status: 400 });

  const exportado = await exportaPeriodoProtegido(
    ator,
    { obraId, ...pedido.valor },
    perfil,
    ambiente,
  );
  if (!exportado.ok) {
    return Response.json(
      { erro: exportado.erro.mensagem },
      { status: statusDaExportacao(exportado.erro) },
    );
  }

  // Cópia para buffer próprio, como na rota do diário: o corpo de `Response`
  // exige `ArrayBuffer`, e copiar é mais honesto que calar o compilador.
  const bytes = new Uint8Array(exportado.valor.bytes.byteLength);
  bytes.set(exportado.valor.bytes);

  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type':
        pedido.valor.formato === 'XLSX'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      'content-disposition': `attachment; filename="${exportado.valor.nomeDoArquivo}"`,
      // O documento muda quando o lançamento muda: nada de cache intermediário.
      'cache-control': 'no-store',
    },
  });
}

const MODOS: readonly ModoDeExportacaoDePeriodo[] = [
  'consolidado',
  'diarios',
  'consolidado-com-diarios',
];

/** Entrada do navegador é hostil: tipo, faixa e domínio, sempre no servidor. */
function leiaPedidoDeExportacao(bruto: unknown): Result<
  {
    readonly dias: readonly DiaPuro[];
    readonly modo: ModoDeExportacaoDePeriodo;
    readonly formato: FormatoDeExportacaoDePeriodo;
  },
  string
> {
  if (typeof bruto !== 'object' || bruto === null) {
    return erro('O pedido chegou incompleto.');
  }
  const corpo = bruto as Record<string, unknown>;

  if (!Array.isArray(corpo['dias']) || corpo['dias'].length === 0) {
    return erro('Escolha ao menos um dia.');
  }
  const dias: DiaPuro[] = [];
  for (const cru of corpo['dias']) {
    if (typeof cru !== 'string') return erro('Data inválida no pedido.');
    const dia = criaDiaPuro(cru);
    if (!dia.ok) return erro(dia.erro.mensagem);
    dias.push(dia.valor);
  }

  const modo = corpo['modo'];
  if (!MODOS.includes(modo as ModoDeExportacaoDePeriodo)) {
    return erro('Escolha o que exportar.');
  }
  const formato = corpo['formato'];
  if (formato !== 'PDF' && formato !== 'XLSX') return erro('Escolha o formato.');

  // Ordena e tira repetição AQUI, e não confia na tela: o pedido pode não vir
  // dela. O módulo recebe o conjunto já normalizado (contrato, 1.1).
  const unicos = [...new Set(dias)].sort();
  return ok({ dias: unicos, modo: modo as ModoDeExportacaoDePeriodo, formato });
}

function statusDaExportacao(e: ErroDeExportacao): number {
  if (e.tipo === 'acesso') return 403;
  if (e.tipo === 'entrada') return 400;
  if (e.tipo === 'inesperado' || e.codigo === CODIGO_ERRO.FALHA_INESPERADA) return 500;
  if (e.codigo === CODIGO_ERRO.NAO_ENCONTRADO) return 404;
  return 422;
}
