/**
 * Duplas de teste das portas do RDO de período.
 *
 * O módulo `rdo` é cálculo puro: não tem repositório e não importa `src/db`.
 * Enquanto as frentes L e S não entregam, o cálculo do consolidado é
 * exercitado contra estas duplas, que devolvem o que a porta promete e **nada
 * além** — quem conta efetivo, soma acumulado e escolhe a pior letra é o
 * módulo sob teste.
 *
 * Todo dado aqui é **sintético** (CLAUDE.md, Segurança): `PA`, `MT-26`, `R1`
 * são rótulos inventados. Nenhum nome de pessoa real entra em teste.
 *
 * O cabeçalho, os serviços e as funções vêm de `../../teste/duplas.ts`, para
 * que o consolidado e o diário sejam comparados sobre o mesmo cadastro.
 */

import type { DiaPuro } from '../../../../shared/date/dia';
import { deMilesimos } from '../../../../shared/decimal';
import {
  type EquipamentoId,
  idConfiavel,
  type PessoaId,
  type ServicoControladoId,
} from '../../../../shared/id';
import { type ErroDeDominio, ok, type Result } from '../../../../shared/result';
import type { LetraDeTurno } from '../../../../shared/taxonomia';
import type {
  CabecalhoDaObra,
  EquipamentoMobilizado,
  FuncaoParaEfetivo,
  LancamentoDeProducao,
  PessoaMobilizada,
  ServicoControladoComProjeto,
} from '../../portas';
import {
  CABECALHO_PADRAO,
  dia,
  FUNCAO_MOTORISTA,
  FUNCAO_PEDREIRO,
  FUNCAO_TOPOGRAFO,
  FUNCOES_PADRAO,
  quantidade,
  SERVICO_FRESA_BINDER,
  SERVICO_FRESA_CAPA,
  SERVICOS_PADRAO,
} from '../../teste/duplas';
import type {
  AtividadeDeUmDia,
  FaixaDeBms,
  ObservacaoDeUmDia,
  PluviometriaDeUmDia,
  PortasDoRdoDePeriodo,
  RegistroDeDiaDoConjunto,
} from '../portas';

export {
  dia,
  FUNCAO_MOTORISTA,
  FUNCAO_PEDREIRO,
  FUNCAO_TOPOGRAFO,
  quantidade,
  SERVICO_FRESA_BINDER,
  SERVICO_FRESA_CAPA,
  SERVICOS_PADRAO,
};

export const PESSOA_A: PessoaId = idConfiavel('PA');
export const PESSOA_B: PessoaId = idConfiavel('PB');
export const PESSOA_C: PessoaId = idConfiavel('PC');
export const EQUIPAMENTO_CF29: EquipamentoId = idConfiavel('CF-29');

/**
 * Setembro de 2026, o mês do gabarito.
 *
 * - `PA` Motorista, entra em 01/09 e não sai;
 * - `PB` Motorista, entra em 04/09 e não sai;
 * - `PC` Pedreiro, entra em 01/09 e **sai em 02/09** — e conta no dia da saída
 *   (decisão 1.1), que é o caso obrigatório 1.
 */
export const PESSOAL_DE_SETEMBRO: readonly PessoaMobilizada[] = [
  {
    pessoaId: PESSOA_A,
    passagens: [{ funcaoId: FUNCAO_MOTORISTA, entrada: dia('2026-09-01'), saida: null }],
  },
  {
    pessoaId: PESSOA_B,
    passagens: [{ funcaoId: FUNCAO_MOTORISTA, entrada: dia('2026-09-04'), saida: null }],
  },
  {
    pessoaId: PESSOA_C,
    passagens: [
      {
        funcaoId: FUNCAO_PEDREIRO,
        entrada: dia('2026-09-01'),
        saida: dia('2026-09-02'),
      },
    ],
  },
];

export const EQUIPAMENTOS_DE_SETEMBRO: readonly EquipamentoMobilizado[] = [
  {
    equipamentoId: EQUIPAMENTO_CF29,
    identificador: 'CF-29',
    ordem: 1,
    passagens: [{ entrada: dia('2026-09-01'), saida: null }],
  },
];

export const PERIODOS_BMS_PADRAO: readonly FaixaDeBms[] = [
  { numero: 7, dataInicial: dia('2026-09-01'), dataFinal: dia('2026-09-30') },
  { numero: 8, dataInicial: dia('2026-10-01'), dataFinal: dia('2026-10-31') },
];

export interface DadosDePeriodoFalsos {
  readonly cabecalho: CabecalhoDaObra;
  readonly periodos: readonly FaixaDeBms[];
  readonly dias: readonly RegistroDeDiaDoConjunto[];
  readonly funcoes: readonly FuncaoParaEfetivo[];
  readonly pessoas: readonly PessoaMobilizada[];
  readonly equipamentos: readonly EquipamentoMobilizado[];
  readonly servicos: readonly ServicoControladoComProjeto[];
  readonly producao: readonly LancamentoDeProducao[];
  readonly atividades: readonly AtividadeDeUmDia[];
  readonly pluviometria: readonly PluviometriaDeUmDia[];
  readonly observacoes: readonly ObservacaoDeUmDia[];
}

const VAZIO: DadosDePeriodoFalsos = {
  cabecalho: CABECALHO_PADRAO,
  periodos: PERIODOS_BMS_PADRAO,
  dias: [],
  funcoes: FUNCOES_PADRAO,
  pessoas: PESSOAL_DE_SETEMBRO,
  equipamentos: EQUIPAMENTOS_DE_SETEMBRO,
  servicos: SERVICOS_PADRAO,
  producao: [],
  atividades: [],
  pluviometria: [],
  observacoes: [],
};

export function registroTrabalhado(data: string): RegistroDeDiaDoConjunto {
  return {
    dia: dia(data),
    estado: 'trabalhado',
    motivoParada: null,
    numeroRdoCongelado: null,
    eDiaFechado: false,
  };
}

export function registroParado(data: string, motivo: string): RegistroDeDiaDoConjunto {
  return {
    dia: dia(data),
    estado: 'parado',
    motivoParada: motivo,
    numeroRdoCongelado: null,
    eDiaFechado: false,
  };
}

function entrega<T>(valor: T): Promise<Result<T, ErroDeDominio>> {
  return Promise.resolve(ok(valor));
}

function noConjunto<T extends { readonly data: DiaPuro }>(
  itens: readonly T[],
  dias: readonly DiaPuro[],
): readonly T[] {
  const conjunto = new Set<string>(dias);
  return itens.filter((i) => conjunto.has(i.data));
}

/**
 * Monta as portas plurais a partir de dados sintéticos.
 *
 * A única lógica aqui é a que pertence às frentes L e S: recortar pelo conjunto
 * de dias e recortar a produção até o dia. Regra de RDO, nenhuma.
 */
export function criaPortasDePeriodoFalsas(
  ajustes: Partial<DadosDePeriodoFalsos> = {},
): PortasDoRdoDePeriodo {
  const dados: DadosDePeriodoFalsos = { ...VAZIO, ...ajustes };

  return {
    cabecalho: () => entrega(dados.cabecalho),
    funcoes: () => entrega(dados.funcoes),
    pessoalMobilizado: () => entrega(dados.pessoas),
    equipamentosMobilizados: () => entrega(dados.equipamentos),
    servicos: () => entrega(dados.servicos),
    lancamentosDeProducaoAte: (_obraId, ate) =>
      entrega(dados.producao.filter((l) => l.data <= ate)),
    periodosBms: () => entrega(dados.periodos),
    diasDeObra: (_obraId, dias) => {
      const conjunto = new Set<string>(dias);
      return entrega(dados.dias.filter((d) => conjunto.has(d.dia)));
    },
    atividadesDosDias: (_obraId, dias) => entrega(noConjunto(dados.atividades, dias)),
    pluviometriaDosDias: (_obraId, dias) => entrega(noConjunto(dados.pluviometria, dias)),
    observacoesCrosDosDias: (_obraId, dias) =>
      entrega(noConjunto(dados.observacoes, dias)),
  };
}

export function atividadeEm(
  id: string,
  data: string,
  descricao: string,
  status: string,
): AtividadeDeUmDia {
  return { lancamentoId: idConfiavel(id), data: dia(data), descricao, status };
}

export function observacaoEm(id: string, data: string, texto: string): ObservacaoDeUmDia {
  return { lancamentoId: idConfiavel(id), data: dia(data), texto };
}

export function leituraEm(
  data: string,
  noiteAnterior: LetraDeTurno | null,
  manha: LetraDeTurno | null,
  tarde: LetraDeTurno | null,
  indice: number,
): PluviometriaDeUmDia {
  return {
    data: dia(data),
    noiteAnterior,
    manha,
    tarde,
    // `deTextoDoUsuario` recusa zero, e o índice zero é legítimo (decisão 3.2).
    indiceMm: deMilesimos(indice * 1000),
  };
}

export function producaoEm(
  id: string,
  servicoId: ServicoControladoId,
  data: string,
  valor: string,
): LancamentoDeProducao {
  return {
    lancamentoId: idConfiavel(id),
    servicoId,
    data: dia(data),
    quantidade: quantidade(valor),
  };
}
