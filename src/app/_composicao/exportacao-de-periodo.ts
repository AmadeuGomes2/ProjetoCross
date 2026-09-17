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
import type { DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import { erro, erroDeDominio, ok, CODIGO_ERRO, type Result } from '../../shared/result';
import type { ObraId } from '../../shared/id';
import type { Ator } from '../../modules/acesso';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { criaPortasDoRdo } from './rdo-diario';
import { portasDoRdoDePeriodoProtegidas } from './rdo-de-periodo';

export function criaPortasDoExportDePeriodo(
  ator: Ator,
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
  ator: Ator,
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
