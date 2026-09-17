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
import { interpretaPedidoDeRdoDePeriodo } from '../../modules/rdo/borda/esquemas-de-periodo';
import { montaRdoDePeriodo } from '../../modules/rdo/periodo/monta-rdo-de-periodo';
import { paraDocumentoDePeriodo } from '../../modules/rdo/periodo/para-documento-de-periodo';
import { paraDocumento } from '../../modules/rdo/para-documento';
import type { DiaPuro } from '../../shared/date/dia';
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

      /**
       * Os diários do período.
       *
       * **Divergência declarada do contrato** (`docs/arquitetura/periodo.md`,
       * seção 3): o contrato pede que os anexos saiam de portas em memória
       * sobre o mesmo instantâneo do consolidado, e a composição só expõe as
       * portas do período — as do diário ainda consultam o banco.
       *
       * O risco é de correção, não de acesso: a autorização já correu para
       * esta obra e o repositório filtra por ela. O que pode acontecer é um
       * lançamento gravado no meio fazer o anexo discordar do resumo que ele
       * acompanha, dentro do mesmo arquivo. Fica registrado porque calar seria
       * pior.
       */
      const montaDiarios = async () => {
        const portasDoDiario = criaPortasDoRdo(ambiente);
        const feitos: ReturnType<typeof paraDocumento>[] = [];
        for (const dia of dias) {
          const montado = await montaRdoDiario(obraId, dia, portasDoDiario);
          if (!montado.ok) return erro(montado.erro);
          feitos.push(paraDocumento(montado.valor));
        }
        return ok(feitos);
      };

      const montaConsolidado = async () => {
        const montado = await montaRdoDePeriodo(obraId, dias, portas.valor);
        if (!montado.ok) return erro(montado.erro);
        return ok(paraDocumentoDePeriodo(montado.valor));
      };

      /*
       * Um ramo por modo, cada um devolvendo o pacote pronto.
       *
       * A primeira versão montava as duas partes soltas e juntava no fim, e
       * precisava de um `consolidado === null || !consolidado.ok` que nenhum
       * teste alcançava. Caminho de erro morto é pior que caminho de erro
       * nenhum, porque parece proteger.
       */
      if (modo === 'diarios') {
        const diarios = await montaDiarios();
        return diarios.ok ? ok({ modo, diarios: diarios.valor }) : erro(diarios.erro);
      }

      const consolidado = await montaConsolidado();
      if (!consolidado.ok) return erro(consolidado.erro);

      if (modo === 'consolidado') return ok({ modo, consolidado: consolidado.valor });

      const diarios = await montaDiarios();
      if (!diarios.ok) return erro(diarios.erro);
      return ok({ modo, consolidado: consolidado.valor, diarios: diarios.valor });
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
  const pedido = leiaPedidoDeExportacao(obraId, corpo);
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

function ehModo(valor: unknown): valor is ModoDeExportacaoDePeriodo {
  return MODOS.includes(valor as ModoDeExportacaoDePeriodo);
}

function ehFormato(valor: unknown): valor is FormatoDeExportacaoDePeriodo {
  return valor === 'PDF' || valor === 'XLSX';
}

/**
 * Lê o pedido do navegador, que é entrada hostil.
 *
 * **O conjunto de dias passa por `interpretaPedidoDeRdoDePeriodo`**, a borda do
 * módulo — e não por uma validação escrita aqui. A primeira versão desta função
 * tinha a sua própria, e faltava nela o teto de 366 dias: um POST com 20.000
 * datas válidas era aceito, e a leitura do instantâneo acontecia com o conjunto
 * inteiro antes de qualquer recusa. Sessão válida bastava para derrubar o
 * servidor.
 *
 * Duas bordas para a mesma entrada é sempre isso: uma delas fica para trás.
 */
function leiaPedidoDeExportacao(
  obraId: ObraId,
  bruto: unknown,
): Result<
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

  // Ordem, repetição, dia inválido e o teto: tudo do módulo, num lugar só.
  const pedido = interpretaPedidoDeRdoDePeriodo({ obraId, dias: corpo['dias'] });
  if (!pedido.ok) return erro(pedido.erro.mensagem);

  if (!ehModo(corpo['modo'])) return erro('Escolha o que exportar.');
  if (!ehFormato(corpo['formato'])) return erro('Escolha o formato.');

  return ok({
    dias: pedido.valor.dias,
    modo: corpo['modo'],
    formato: corpo['formato'],
  });
}

function statusDaExportacao(e: ErroDeExportacao): number {
  if (e.tipo === 'acesso') return 403;
  if (e.tipo === 'entrada') return 400;
  if (e.tipo === 'inesperado' || e.codigo === CODIGO_ERRO.FALHA_INESPERADA) return 500;
  if (e.codigo === CODIGO_ERRO.NAO_ENCONTRADO) return 404;
  return 422;
}
