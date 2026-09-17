/**
 * Períodos de BMS — o campo `BM'S` do cabeçalho do RDO.
 *
 * Decisão 7.1, de 16/09/2026: **não existe ciclo fixo**. O engenheiro cadastra
 * os períodos (número, início, fim) e o RDO deriva o número pela data do dia.
 * A tabela legada, que ia de 2022 a 2025 e não cobria 2026, foi descartada.
 *
 * R25 e regras-extraidas §8:
 *
 *     dias do periodo = data final − data inicial + 1
 *
 * O `+ 1` não é detalhe: sem ele, um período de um dia dá zero. E a validação
 * de "final não anterior à inicial" existe porque o BMS 4 da planilha tem
 * **−716 dias** e ninguém viu (caso de teste obrigatório 9).
 */

import { diaEstaNoIntervalo, diferencaEmDias, type DiaPuro } from '../../shared/date/dia';
import {
  intervalosSeSobrepoem,
  ordemDasDatasEstaInvertida,
} from '../../shared/date/intervalo';
import { instanteAgora, type Instante } from '../../shared/date/fuso';
import { geraId, type ObraId, type PeriodoBmsId, type UsuarioId } from '../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import * as repositorio from './repositorio';
import type { Ambiente, AtorDaObra, PeriodoBms, PeriodoBmsNovo } from './tipos';

/** Derivado, nunca gravado. `final − inicial + 1`. */
export function diasDoPeriodo(dataInicial: DiaPuro, dataFinal: DiaPuro): number {
  return diferencaEmDias(dataInicial, dataFinal) + 1;
}

/**
 * "Não anterior" inclui o mesmo dia (R14): um período de um dia é válido, e o
 * dia igual é o limite exato do aceite.
 *
 * A comparação mora em `shared/date/intervalo`, como já acontece em `pessoal` e
 * `equipamento`. O que é deste módulo é só a mensagem.
 */
export function validaIntervalo(
  dataInicial: DiaPuro,
  dataFinal: DiaPuro,
): Result<void, ErroDeDominio> {
  if (ordemDasDatasEstaInvertida({ inicio: dataInicial, fim: dataFinal })) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data final não pode ser anterior à inicial.',
      ),
    );
  }
  return ok(undefined);
}

/** Período de BMS na forma de intervalo de `shared/date`. Fim sempre fechado. */
function comoIntervalo(p: {
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}): { inicio: DiaPuro; fim: DiaPuro } {
  return { inicio: p.dataInicial, fim: p.dataFinal };
}

/**
 * Valida um conjunto de períodos contra si mesmo e contra o que já existe.
 *
 * Sobreposição é recusada (arquitetura, decisão 11 e pergunta P5): o `BM'S` é
 * o que amarra a fatura, e duas respostas para o mesmo dia viram pedido de
 * correção do fiscal. Não é expressável em `CHECK`, por isso mora aqui.
 */
export function validaConjuntoDePeriodos(
  novos: readonly PeriodoBmsNovo[],
  existentes: readonly { numero: number; dataInicial: DiaPuro; dataFinal: DiaPuro }[],
): Result<void, ErroDeDominio> {
  const acumulados = [...existentes];

  for (const periodo of novos) {
    const intervalo = validaIntervalo(periodo.dataInicial, periodo.dataFinal);
    if (!intervalo.ok) return intervalo;

    if (!Number.isInteger(periodo.numero) || periodo.numero < 0) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NUMERO_INVALIDO,
          'O número do período de BMS precisa ser um inteiro não negativo.',
        ),
      );
    }

    if (acumulados.some((p) => p.numero === periodo.numero)) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.JA_EXISTE,
          `Já existe o período de BMS ${periodo.numero} nesta obra.`,
        ),
      );
    }

    // `find`, e não `conflitaComAlgum`: a mensagem diz **qual** período está no
    // caminho, e "se sobrepõe a algum" mandaria o engenheiro procurar. A regra
    // da sobreposição, essa sim, é a de `shared/date/intervalo` — era a
    // terceira cópia dela no sistema, depois de `pessoal` e `equipamento`.
    const conflito = acumulados.find((p) =>
      intervalosSeSobrepoem(comoIntervalo(p), comoIntervalo(periodo)),
    );
    if (conflito !== undefined) {
      return erro(
        erroDeDominio(
          // Sobreposição não é ordem invertida: aquela é um intervalo só, de
          // cabeça para baixo (`validaIntervalo`, acima); esta são dois
          // intervalos brigando pelo mesmo trecho de calendário. O código é
          // chave de log, e o errado fazia o registro contradizer a mensagem.
          CODIGO_ERRO.INTERVALO_SOBREPOSTO,
          `Este intervalo se sobrepõe ao período de BMS ${conflito.numero}. Ajuste as datas.`,
        ),
      );
    }

    acumulados.push(periodo);
  }

  return ok(undefined);
}

/** Grava os períodos. Usado pela criação da obra e pelo cadastro avulso. */
export function gravaPeriodos(
  db: Ambiente['db'],
  obraId: ObraId,
  novos: readonly PeriodoBmsNovo[],
  criadoPor: UsuarioId,
  criadoEm: Instante,
): PeriodoBmsId[] {
  return novos.map((periodo) => {
    const id = geraId<'periodo_bms'>();
    repositorio.inserePeriodo(db, {
      id,
      obraId,
      numero: periodo.numero,
      dataInicial: periodo.dataInicial,
      dataFinal: periodo.dataFinal,
      criadoPor,
      criadoEm,
    });
    return id;
  });
}

export interface ComandoPeriodoBms {
  readonly obraId: ObraId;
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

export function cadastraPeriodoBms(
  cmd: ComandoPeriodoBms,
  ator: AtorDaObra,
  amb: Ambiente,
): Result<PeriodoBmsId, ErroDeDominio> {
  if (repositorio.buscaObra(amb.db, cmd.obraId) === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  const existentes = repositorio.listaPeriodos(amb.db, cmd.obraId);
  const conferencia = validaConjuntoDePeriodos([cmd], existentes);
  if (!conferencia.ok) return conferencia;

  const ids = gravaPeriodos(
    amb.db,
    cmd.obraId,
    [cmd],
    ator.usuarioId,
    instanteAgora(amb.relogio),
  );
  const id = ids[0];
  if (id === undefined) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Não foi possível cadastrar o período.'),
    );
  }
  return ok(id);
}

export function listaPeriodosBms(
  obraId: ObraId,
  amb: Ambiente,
): Result<PeriodoBms[], ErroDeDominio> {
  return ok(
    repositorio.listaPeriodos(amb.db, obraId).map((p) => ({
      id: p.id,
      numero: p.numero,
      dataInicial: p.dataInicial,
      dataFinal: p.dataFinal,
      dias: diasDoPeriodo(p.dataInicial, p.dataFinal),
    })),
  );
}

/**
 * O `BM'S` do cabeçalho: o número do período cujo intervalo contém a data.
 *
 * Fronteiras que importam: o **primeiro** e o **último** dia do intervalo são
 * do período (CT-023, CT-024). É o mesmo erro de `<` contra `≤` que a planilha
 * comete no efetivo, agora no intervalo do BMS.
 *
 * Data não coberta devolve `null` **sem erro** (decisão 21.1): o campo sai
 * vazio, a tela avisa e o RDO é gerado. A planilha imprime um 7 arbitrário sem
 * tabela que o sustente; vazio com aviso é honesto, número inventado não é.
 */
export function resolveBmsDoDia(
  obraId: ObraId,
  dia: DiaPuro,
  amb: Ambiente,
): Result<number | null, ErroDeDominio> {
  const periodo = repositorio
    .listaPeriodos(amb.db, obraId)
    .find((p) => diaEstaNoIntervalo(dia, p.dataInicial, p.dataFinal));
  return ok(periodo?.numero ?? null);
}

/**
 * Editar um período (17/09/2026).
 *
 * A conferência de conjunto roda **sem o próprio período na lista de
 * existentes**. Sem isso, salvar o BM'S 7 sem mudar nada devolveria "já existe
 * o período de BMS 7 nesta obra": ele colidiria consigo mesmo.
 *
 * Alterar as datas **não toca em lançamento nenhum**. O que muda é qual número
 * de BM'S sai no cabeçalho dos RDOs daqueles dias, porque `resolveBmsDoDia`
 * resolve por data a cada consulta. Quem chama avisa o tamanho disso antes
 * (`_composicao/impacto.ts`).
 */
export function atualizaPeriodoBms(
  cmd: ComandoPeriodoBms & { readonly periodoId: PeriodoBmsId },
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  if (repositorio.buscaObra(amb.db, cmd.obraId) === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  const existentes = repositorio.listaPeriodos(amb.db, cmd.obraId);
  if (!existentes.some((p) => p.id === cmd.periodoId)) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Período não encontrado.'));
  }

  const outros = existentes.filter((p) => p.id !== cmd.periodoId);
  const conferencia = validaConjuntoDePeriodos([cmd], outros);
  if (!conferencia.ok) return conferencia;

  repositorio.atualizaPeriodo(amb.db, cmd.obraId, cmd.periodoId, {
    numero: cmd.numero,
    dataInicial: cmd.dataInicial,
    dataFinal: cmd.dataFinal,
  });
  return ok(undefined);
}

/**
 * Excluir um período (17/09/2026).
 *
 * **Não bloqueia por haver dia lançado dentro dele.** O dia continua lançado, o
 * RDO continua sendo gerado, e o campo `BM'S` passa a sair vazio com aviso —
 * exatamente o que a decisão 21.1 já definiu para dia fora de qualquer período.
 * Bloquear seria inventar uma trava que a regra não pede, e deixaria o
 * engenheiro preso a um período digitado errado.
 *
 * Quem chama mostra o tamanho do impacto antes (`_composicao/impacto.ts`).
 */
export function excluiPeriodoBms(
  obraId: ObraId,
  periodoId: PeriodoBmsId,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  const existentes = repositorio.listaPeriodos(amb.db, obraId);
  if (!existentes.some((p) => p.id === periodoId)) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Período não encontrado.'));
  }

  repositorio.excluiPeriodo(amb.db, obraId, periodoId);
  return ok(undefined);
}
