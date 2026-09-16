/**
 * Avisos da tela do RDO.
 *
 * Aviso **nunca bloqueia** a montagem nem a exportação, e **nunca** entra no
 * PDF: o gabarito impresso não tem campo de aviso, e o fiscal recebe o
 * documento, não o diagnóstico do cadastro.
 *
 * - `BMS_SEM_PERIODO` (decisão 21.1): campo vazio, aviso na tela, RDO gerado.
 *   Erro ou bloqueio puniria o fiscal por cadastro incompleto do engenheiro.
 * - `ACUMULADO_ACIMA_DO_PROJETO` (caso obrigatório 6): a planilha não tinha
 *   limite superior nem alerta. Travar o RDO impediria a medição de um aditivo.
 * - `PRODUCAO_SEM_ATIVIDADE` (decisão 12.1, caso obrigatório 5): 27/03/2026 é
 *   assim no arquivo real; o bloco de atividades vazio não pode esconder que
 *   houve medição.
 * - `SEM_RESPONSAVEL_TECNICO`: o bloco 11 sai sem nome, titulação e CREA, e o
 *   fiscal recusa documento assim. Ver P7 de docs/arquitetura/v1.md — enquanto
 *   não há decisão, isto é aviso e não bloqueio de exportação.
 *
 * Nenhuma mensagem daqui carrega nome de pessoa.
 */

import { ehZero } from '../../shared/decimal';
import type { LinhaDeProducao } from './producao';
import { AVISO_DO_RDO, type AvisoDoRdo, type LinhaDeAtividade } from './tipos';
import type { ResponsavelTecnico } from './portas';

export interface EntradaDosAvisos {
  readonly bms: number | null;
  readonly producao: readonly LinhaDeProducao[];
  readonly atividades: readonly LinhaDeAtividade[];
  readonly responsavelTecnico: ResponsavelTecnico | null;
}

export function calculaAvisos(entrada: EntradaDosAvisos): readonly AvisoDoRdo[] {
  const avisos: AvisoDoRdo[] = [];

  if (entrada.bms === null) {
    avisos.push({
      codigo: AVISO_DO_RDO.BMS_SEM_PERIODO,
      mensagem:
        "Nenhum período de BMS cadastrado cobre esta data. O campo BM'S sai vazio até que o período seja cadastrado.",
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

  const temProducaoNoDia = entrada.producao.some((l) => !ehZero(l.executado));
  const temAtividade = entrada.atividades.some((l) => l.tipo === 'atividade');
  if (temProducaoNoDia && !temAtividade) {
    avisos.push({
      codigo: AVISO_DO_RDO.PRODUCAO_SEM_ATIVIDADE,
      mensagem:
        'Este dia tem produção lançada e nenhuma atividade. Confira se falta lançar a atividade do dia.',
      servicoId: null,
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
