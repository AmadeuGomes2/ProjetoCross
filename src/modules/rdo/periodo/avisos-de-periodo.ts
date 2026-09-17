/**
 * Avisos da tela do consolidado.
 *
 * Como no diário (`../avisos.ts`), aviso **nunca bloqueia** e **nunca entra no
 * documento**: o gabarito impresso não tem campo de aviso, e o fiscal recebe o
 * documento, não o diagnóstico do cadastro.
 *
 * Três códigos são do período (`AVISO_DO_PERIODO`) e três são reaproveitados do
 * diário (`AVISO_DO_RDO`), com o mesmo significado no plural. Os códigos são
 * importados de lá, nunca redeclarados: eles viram chave de tradução e de log.
 *
 * **O que deliberadamente não entra:** `PRODUCAO_SEM_ATIVIDADE`. Ele é uma
 * pergunta sobre **um dia** ("faltou lançar a atividade deste dia?"), e no
 * consolidado ou viraria trinta avisos ou responderia outra pergunta. O dia com
 * produção e sem atividade continua visível no bloco 8, que traz um grupo por
 * data. `docs/arquitetura/periodo.md` não enumera quais avisos do diário valem
 * no período; esta é a leitura desta frente, e está registrada aqui para ser
 * contestada em um lugar só.
 *
 * Nenhuma mensagem daqui carrega nome de pessoa.
 */

import type { ResponsavelTecnico } from '../portas';
import { AVISO_DO_RDO } from '../tipos';
import { AVISO_DO_PERIODO, type AvisoDoPeriodo } from './tipos';
import type { LinhaDeProducaoDoPeriodo } from './tipos';

export interface EntradaDosAvisosDoPeriodo {
  readonly bms: readonly number[];
  readonly quantidadeDeDias: number;
  readonly diasLancados: number;
  readonly eContiguo: boolean;
  readonly producao: readonly LinhaDeProducaoDoPeriodo[];
  readonly responsavelTecnico: ResponsavelTecnico | null;
}

export function calculaAvisosDoPeriodo(
  entrada: EntradaDosAvisosDoPeriodo,
): readonly AvisoDoPeriodo[] {
  const avisos: AvisoDoPeriodo[] = [];

  if (!entrada.eContiguo) {
    avisos.push({
      codigo: AVISO_DO_PERIODO.CONJUNTO_NAO_CONTIGUO,
      mensagem:
        'Os dias escolhidos não são seguidos. Os dias escolhidos não são seguidos, e os dias do meio que ficaram de fora não entram nas contas.',
      servicoId: null,
    });
  }

  if (entrada.diasLancados === 0) {
    avisos.push({
      codigo: AVISO_DO_PERIODO.PERIODO_SEM_DIA_LANCADO,
      mensagem:
        'Nenhum dia do período foi lançado: o efetivo médio sai em branco porque não há dia nenhum para dividir.',
      servicoId: null,
    });
  } else if (entrada.diasLancados < entrada.quantidadeDeDias) {
    const naoLancados = entrada.quantidadeDeDias - entrada.diasLancados;
    avisos.push({
      codigo: AVISO_DO_PERIODO.DIAS_NAO_LANCADOS,
      mensagem:
        naoLancados === 1
          ? 'Um dia do período não foi lançado e ficou fora da média do efetivo.'
          : `${naoLancados} dias do período não foram lançados e ficaram fora da média do efetivo.`,
      servicoId: null,
    });
  }

  if (entrada.bms.length === 0) {
    avisos.push({
      codigo: AVISO_DO_RDO.BMS_SEM_PERIODO,
      mensagem:
        "Nenhum período de BMS cadastrado cobre os dias escolhidos. O campo BM'S sai vazio até que o período seja cadastrado.",
      servicoId: null,
    });
  }

  for (const linha of entrada.producao) {
    if (!linha.acumuladoAcimaDoProjeto) continue;
    avisos.push({
      codigo: AVISO_DO_RDO.ACUMULADO_ACIMA_DO_PROJETO,
      mensagem: `O acumulado de ${linha.nome} passou a quantidade de projeto. Confira os lançamentos ou atualize a quantidade de projeto.`,
      servicoId: linha.servicoId,
    });
  }

  if (entrada.responsavelTecnico === null) {
    avisos.push({
      codigo: AVISO_DO_RDO.SEM_RESPONSAVEL_TECNICO,
      mensagem:
        'A obra ainda não tem responsável técnico cadastrado: o bloco de assinaturas sai sem titulação e sem registro.',
      servicoId: null,
    });
  }

  return avisos;
}
