/**
 * Duplas de teste das portas do RDO.
 *
 * O módulo `rdo` é cálculo puro: não tem repositório e não importa `src/db`.
 * Enquanto as frentes A e B não entregam as implementações reais, o cálculo é
 * exercitado contra estas duplas, que devolvem exatamente o que a porta promete
 * e nada além.
 *
 * Todo dado aqui é **sintético** (CLAUDE.md, Segurança): "P1", "MT-26",
 * "R1" são rótulos inventados, iguais aos dos casos de `docs/qa/`. Nenhum nome
 * de pessoa real entra em teste, fixture ou exemplo.
 */

import {
  type DiaPuro,
  diaEstaNoIntervalo,
  diaPuroConfiavel,
} from '../../../shared/date/dia';
import { deMilesimos, deTextoDoUsuario, type Quantidade } from '../../../shared/decimal';
import {
  type EquipamentoId,
  type FuncaoId,
  idConfiavel,
  type LancamentoId,
  type ObraId,
  type PessoaId,
  type ServicoControladoId,
} from '../../../shared/id';
import { type ErroDeDominio, ok, type Result } from '../../../shared/result';
import type { LetraDeTurno } from '../../../shared/taxonomia';
import type {
  AtividadeDoDia,
  CabecalhoDaObra,
  DiaDeObra,
  EquipamentoMobilizado,
  FuncaoParaEfetivo,
  LancamentoDeProducao,
  ObservacaoDoDia,
  PessoaMobilizada,
  PluviometriaDoDia,
  PortasDoRdo,
  ServicoControladoComProjeto,
} from '../portas';

export const OBRA: ObraId = idConfiavel('B02');

/** Atalho de leitura para os testes. Lança em valor inválido, de propósito. */
export function dia(bruto: string): DiaPuro {
  return diaPuroConfiavel(bruto);
}

/** Quantidade a partir do texto que uma pessoa digitaria: vírgula decimal. */
export function quantidade(bruto: string): Quantidade {
  const r = deTextoDoUsuario(bruto);
  if (!r.ok) throw new Error(`fixture inválida: ${bruto}`);
  return r.valor;
}

export interface PeriodoBmsFalso {
  readonly numero: number;
  readonly inicial: string;
  readonly final: string;
}

export interface DadosFalsos {
  readonly cabecalho: CabecalhoDaObra;
  readonly periodos: readonly PeriodoBmsFalso[];
  readonly dias: Readonly<Record<string, DiaDeObra>>;
  readonly funcoes: readonly FuncaoParaEfetivo[];
  readonly pessoas: readonly PessoaMobilizada[];
  readonly equipamentos: readonly EquipamentoMobilizado[];
  readonly servicos: readonly ServicoControladoComProjeto[];
  readonly producao: readonly LancamentoDeProducao[];
  readonly atividades: Readonly<Record<string, readonly AtividadeDoDia[]>>;
  readonly pluviometria: Readonly<Record<string, PluviometriaDoDia>>;
  readonly observacoes: Readonly<Record<string, readonly ObservacaoDoDia[]>>;
}

export const CABECALHO_PADRAO: CabecalhoDaObra = {
  obraId: OBRA,
  contrato: 'P0476/01-25 - BLOCO 02',
  contratante: 'PREFEITURA MUNICIPAL DE MONTES CLAROS - MG',
  contratada: 'CROS CONSTRUÇÕES S.A.',
  escopo: 'EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO',
  dataInicio: dia('2026-02-05'),
  dataTermino: dia('2027-02-05'),
  nomeProjeto: 'SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02',
  area: 'MONTES CLAROS - MG',
  local: 'VIAS URBANAS  DA CIDADE MONTES CLAROS - MG',
  responsavelTecnico: {
    nome: 'R1',
    titulo: 'Engenheiro Civil',
    registro: 'CREA - MG 000000/D',
  },
};

export const FUNCAO_MOTORISTA: FuncaoId = idConfiavel('f-motorista');
export const FUNCAO_PEDREIRO: FuncaoId = idConfiavel('f-pedreiro');
export const FUNCAO_TOPOGRAFO: FuncaoId = idConfiavel('f-topografo');

export const FUNCOES_PADRAO: readonly FuncaoParaEfetivo[] = [
  { funcaoId: FUNCAO_MOTORISTA, termo: 'Motorista', ordem: 1 },
  { funcaoId: FUNCAO_PEDREIRO, termo: 'Pedreiro', ordem: 2 },
  { funcaoId: FUNCAO_TOPOGRAFO, termo: 'Topografo', ordem: 3 },
];

export function idDaPessoa(rotulo: string): PessoaId {
  return idConfiavel(rotulo);
}

export const PESSOA_1: PessoaId = idConfiavel('P1');
export const PESSOA_2: PessoaId = idConfiavel('P2');
export const PESSOA_3: PessoaId = idConfiavel('P3');
export const EQUIPAMENTO_MT26: EquipamentoId = idConfiavel('MT-26');

/** O contexto de CT-182 a CT-196, em `docs/qa/v1-casos-passo-5.md`. */
export const PESSOAL_PADRAO: readonly PessoaMobilizada[] = [
  {
    pessoaId: PESSOA_1,
    funcaoId: FUNCAO_MOTORISTA,
    passagens: [{ entrada: dia('2026-02-10'), saida: dia('2026-02-20') }],
  },
  {
    pessoaId: PESSOA_2,
    funcaoId: FUNCAO_MOTORISTA,
    passagens: [{ entrada: dia('2026-02-05'), saida: null }],
  },
  {
    pessoaId: PESSOA_3,
    funcaoId: FUNCAO_PEDREIRO,
    passagens: [{ entrada: dia('2026-02-16'), saida: null }],
  },
];

/** Duas passagens do mesmo equipamento: caso obrigatório 8. */
export const EQUIPAMENTOS_PADRAO: readonly EquipamentoMobilizado[] = [
  {
    equipamentoId: EQUIPAMENTO_MT26,
    identificador: 'MT-26',
    ordem: 1,
    passagens: [
      { entrada: dia('2026-02-05'), saida: dia('2026-02-18') },
      { entrada: dia('2026-03-01'), saida: null },
    ],
  },
];

export const SERVICO_FRESA_CAPA: ServicoControladoId = idConfiavel('s-1');
export const SERVICO_FRESA_BINDER: ServicoControladoId = idConfiavel('s-2');
export const SERVICO_RECICLAGEM: ServicoControladoId = idConfiavel('s-3');
export const SERVICO_IMPLANTACAO: ServicoControladoId = idConfiavel('s-4');

export const SERVICOS_PADRAO: readonly ServicoControladoComProjeto[] = [
  {
    servicoId: SERVICO_FRESA_CAPA,
    nome: 'REC.(FRESA+CAPA)',
    ordem: 1,
    quantidadeDeProjeto: quantidade('2210,392'),
  },
  {
    servicoId: SERVICO_FRESA_BINDER,
    nome: 'REC.(FRESA+BINDER+CAPA)',
    ordem: 2,
    quantidadeDeProjeto: quantidade('1000'),
  },
  {
    servicoId: SERVICO_RECICLAGEM,
    nome: 'RECICLAGEM(BASE+CAPA)',
    ordem: 3,
    quantidadeDeProjeto: quantidade('1000'),
  },
  {
    servicoId: SERVICO_IMPLANTACAO,
    nome: 'IM.(SUBLEITO+BASE+CAPA)',
    ordem: 4,
    quantidadeDeProjeto: quantidade('1000'),
  },
];

export function lancamentoDeProducao(
  id: string,
  servicoId: ServicoControladoId,
  data: string,
  valor: string,
): LancamentoDeProducao {
  const lancamentoId: LancamentoId = idConfiavel(id);
  return { lancamentoId, servicoId, data: dia(data), quantidade: quantidade(valor) };
}

export function atividade(id: string, descricao: string, status: string): AtividadeDoDia {
  const lancamentoId: LancamentoId = idConfiavel(id);
  return { lancamentoId, descricao, status };
}

export function observacao(id: string, texto: string): ObservacaoDoDia {
  const lancamentoId: LancamentoId = idConfiavel(id);
  return { lancamentoId, texto };
}

/**
 * Uma leitura de pluviômetro. O índice vem como texto porque é assim que ele é
 * digitado; `deTextoDoUsuario` recusa zero, e o índice zero é legítimo (3.2),
 * então aqui ele passa por `deMilesimos`.
 */
export function leituraDePluviometro(
  noiteAnterior: LetraDeTurno | null,
  manha: LetraDeTurno | null,
  tarde: LetraDeTurno | null,
  indice: number,
): PluviometriaDoDia {
  return { noiteAnterior, manha, tarde, indiceMm: deMilesimos(indice * 1000) };
}

export function diaTrabalhado(): DiaDeObra {
  return {
    estado: 'trabalhado',
    motivoParada: null,
    numeroRdoCongelado: null,
    eDiaFechado: false,
  };
}

export function diaParado(motivo: string): DiaDeObra {
  return {
    estado: 'parado',
    motivoParada: motivo,
    numeroRdoCongelado: null,
    eDiaFechado: false,
  };
}

export function diaFechado(numeroCongelado: number): DiaDeObra {
  return {
    estado: 'trabalhado',
    motivoParada: null,
    numeroRdoCongelado: numeroCongelado,
    eDiaFechado: true,
  };
}

const VAZIO: DadosFalsos = {
  cabecalho: CABECALHO_PADRAO,
  periodos: [
    { numero: 6, inicial: '2026-08-01', final: '2026-08-31' },
    { numero: 7, inicial: '2026-09-01', final: '2026-09-30' },
  ],
  dias: {},
  funcoes: FUNCOES_PADRAO,
  pessoas: PESSOAL_PADRAO,
  equipamentos: EQUIPAMENTOS_PADRAO,
  servicos: SERVICOS_PADRAO,
  producao: [],
  atividades: {},
  pluviometria: {},
  observacoes: {},
};

function entrega<T>(valor: T): Promise<Result<T, ErroDeDominio>> {
  return Promise.resolve(ok(valor));
}

/**
 * Monta as portas a partir de dados sintéticos.
 *
 * A dupla devolve o que a porta promete e **não** aplica regra de RDO nenhuma:
 * quem conta efetivo, soma acumulado e decide transbordo é o módulo sob teste.
 * A única lógica aqui é a que pertence às frentes A e B — resolver o período de
 * BMS que contém a data e recortar a produção até o dia.
 */
export function criaPortasFalsas(ajustes: Partial<DadosFalsos> = {}): PortasDoRdo {
  const dados: DadosFalsos = { ...VAZIO, ...ajustes };

  return {
    cabecalho: () => entrega(dados.cabecalho),
    bms: (_obraId, diaConsultado) => {
      const periodo = dados.periodos.find((p) =>
        diaEstaNoIntervalo(diaConsultado, p.inicial, p.final),
      );
      return entrega(periodo === undefined ? null : periodo.numero);
    },
    dia: (_obraId, diaConsultado) => entrega(dados.dias[diaConsultado] ?? null),
    funcoes: () => entrega(dados.funcoes),
    pessoalMobilizado: () => entrega(dados.pessoas),
    equipamentosMobilizados: () => entrega(dados.equipamentos),
    servicos: () => entrega(dados.servicos),
    lancamentosDeProducaoAte: (_obraId, diaConsultado) =>
      entrega(dados.producao.filter((l) => l.data <= diaConsultado)),
    atividades: (_obraId, diaConsultado) =>
      entrega(dados.atividades[diaConsultado] ?? []),
    pluviometria: (_obraId, diaConsultado) =>
      entrega(dados.pluviometria[diaConsultado] ?? null),
    observacoesCros: (_obraId, diaConsultado) =>
      entrega(dados.observacoes[diaConsultado] ?? []),
  };
}
