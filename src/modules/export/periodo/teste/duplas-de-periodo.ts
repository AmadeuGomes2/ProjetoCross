/**
 * Duplas de teste do documento de período.
 *
 * Dado sintético (CLAUDE.md, Segurança): `P1`, `MT-26`, `R1` são rótulos
 * inventados, e o tipo do documento não tem campo de nome de trabalhador.
 *
 * O conjunto de exemplo é **não contíguo** de propósito: 02, 05 e 09 de
 * setembro de 2026, RDO 209, 212 e 216 — com início de contrato em 05/02/2026,
 * que é a obra de `regras-rdo`, seção 3. É o conjunto em que a faixa `209 a 216`
 * mentiria, afirmando oito dias onde houve três.
 */

import { diaPuroConfiavel } from '../../../../shared/date/dia';
import type { Instante } from '../../../../shared/date/fuso';
import { idConfiavel, type ObraId } from '../../../../shared/id';
import { ok, type ErroDeDominio, type Result } from '../../../../shared/result';
import type { AtorDaExportacao, RdoParaDocumento } from '../../portas';
import { RDO_DE_EXEMPLO } from '../../teste/duplas';
import type {
  EventoDeExportacaoDePeriodo,
  PacoteParaDocumento,
  PortasDoExportDePeriodo,
  RdoDePeriodoParaDocumento,
} from '../portas';

export const OBRA: ObraId = idConfiavel('B02');
export const ENGENHEIRO: AtorDaExportacao = {
  usuarioId: idConfiavel<'usuario'>('E1'),
  perfil: 'engenheiro',
};
export const ENCARREGADO: AtorDaExportacao = {
  usuarioId: idConfiavel<'usuario'>('C1'),
  perfil: 'encarregado',
};
export const MOMENTO: Instante = '2026-09-09T18:00:00.000Z';

export const DIAS_DO_CONJUNTO = [
  diaPuroConfiavel('2026-09-02'),
  diaPuroConfiavel('2026-09-05'),
  diaPuroConfiavel('2026-09-09'),
] as const;

/** Um diário do conjunto, derivado do RDO de exemplo já conferido. */
export function diarioDe(dia: string, numeroDoRdo: number): RdoParaDocumento {
  const [ano, mes, diaDoMes] = dia.split('-');
  return {
    ...RDO_DE_EXEMPLO,
    identificacao: {
      ...RDO_DE_EXEMPLO.identificacao,
      dia: diaPuroConfiavel(dia),
      data: `${diaDoMes ?? ''}/${mes ?? ''}/${ano ?? ''}`,
      numeroDoRdo,
    },
  };
}

export const DIARIOS_DO_CONJUNTO: readonly RdoParaDocumento[] = [
  diarioDe('2026-09-02', 209),
  diarioDe('2026-09-05', 212),
  diarioDe('2026-09-09', 216),
];

export const CONSOLIDADO_DE_EXEMPLO: RdoDePeriodoParaDocumento = {
  // Sem logo: é o caso comum e é o que o teste de fidelidade compara.
  logo: null,
  identificacao: {
    primeiroDia: diaPuroConfiavel('2026-09-02'),
    ultimoDia: diaPuroConfiavel('2026-09-09'),
    data: '02/09/2026 a 09/09/2026',
    quantidadeDeDias: 3,
    bms: '7, 8',
    numerosDoRdo: [209, 212, 216],
  },
  informacoesGerais: RDO_DE_EXEMPLO.informacoesGerais,
  caracteristicas: RDO_DE_EXEMPLO.caracteristicas,
  efetivoPessoal: {
    colunas: [
      { chave: 'f-1', rotulo: 'Motorista', quantidade: '1,7' },
      { chave: 'f-2', rotulo: 'Topografo', quantidade: '' },
    ],
    total: '1,7',
  },
  efetivoEquipamentos: {
    colunas: [{ chave: 'e-1', rotulo: 'MT-26', quantidade: '0,7' }],
    total: '0,7',
  },
  producao: [
    {
      chave: 's-1',
      servico: 'REC.(FRESA+CAPA)',
      exec: '703,50',
      acum: '15.027,03',
      projeto: '2.210,39',
      percentual: '55,85%',
      fracao: 0.5585,
    },
    {
      // Produção zero: o traço da decisão 17.2, que no Excel viraria fórmula.
      chave: 's-3',
      servico: 'RECICLAGEM(BASE+CAPA)',
      exec: '-',
      acum: '-',
      projeto: '1.000,00',
      percentual: '0,00%',
      fracao: 0,
    },
  ],
  atividades: [
    {
      chave: '2026-09-02',
      data: '02/09/2026',
      linhas: [
        { chave: 'a-1', descricao: 'Fresagem', status: 'Produção' },
        { chave: 'a-2', descricao: 'Transporte de fresado', status: 'Transporte' },
      ],
    },
    // Dia não lançado: o grupo aparece **vazio** e não some da lista. Sumir
    // seria corte silencioso (contrato, 2.5).
    { chave: '2026-09-05', data: '05/09/2026', linhas: [] },
    {
      chave: '2026-09-09',
      data: '09/09/2026',
      linhas: [{ chave: 'a-3', descricao: 'Domingo', status: '' }],
    },
  ],
  pluviometria: {
    diasBons: 2,
    diasChuvosos: 1,
    diasImpraticaveis: 0,
    diasParados: 1,
    indice: '12 mm',
  },
  comentariosCros: [
    { chave: '2026-09-02', data: '02/09/2026', linhas: ['Frente liberada'] },
    { chave: '2026-09-09', data: '09/09/2026', linhas: ['Sem frente de serviço'] },
  ],
  responsavelTecnico: RDO_DE_EXEMPLO.responsavelTecnico,
};

/**
 * O consolidado de **um dia só**, derivado do diário do mesmo dia.
 *
 * Nada é redigitado: a média de um dia é o próprio efetivo daquele dia, o
 * executado do período é o executado do dia, e as atividades são as mesmas. É
 * o que torna a comparação com o diário uma verificação e não uma coincidência.
 */
export function consolidadoDeUmDia(diario: RdoParaDocumento): RdoDePeriodoParaDocumento {
  return {
    // A MESMA marca do diário: um arquivo, um cabeçalho.
    logo: diario.logo,
    identificacao: {
      primeiroDia: diario.identificacao.dia,
      ultimoDia: diario.identificacao.dia,
      data: `${diario.identificacao.data} a ${diario.identificacao.data}`,
      quantidadeDeDias: 1,
      bms: diario.identificacao.bms,
      numerosDoRdo: [diario.identificacao.numeroDoRdo],
    },
    informacoesGerais: diario.informacoesGerais,
    caracteristicas: diario.caracteristicas,
    efetivoPessoal: {
      colunas: [...diario.efetivoPessoal.pagina1, ...diario.efetivoPessoal.continuacao],
      total: diario.efetivoPessoal.total,
    },
    efetivoEquipamentos: {
      colunas: [
        ...diario.efetivoEquipamentos.pagina1,
        ...diario.efetivoEquipamentos.continuacao,
      ],
      total: diario.efetivoEquipamentos.total,
    },
    producao: diario.producao,
    atividades: [
      {
        chave: diario.identificacao.dia,
        data: diario.identificacao.data,
        linhas: [...diario.atividades.pagina1, ...diario.atividades.continuacao],
      },
    ],
    pluviometria: {
      diasBons: 1,
      diasChuvosos: 0,
      diasImpraticaveis: 0,
      diasParados: 0,
      indice: diario.pluviometria.indice,
    },
    comentariosCros: [
      {
        chave: diario.identificacao.dia,
        data: diario.identificacao.data,
        linhas: [
          ...diario.comentariosCros.pagina1,
          ...diario.comentariosCros.continuacao,
        ],
      },
    ],
    responsavelTecnico: diario.responsavelTecnico,
  };
}

export const PACOTE_CONSOLIDADO: PacoteParaDocumento = {
  modo: 'consolidado',
  consolidado: CONSOLIDADO_DE_EXEMPLO,
};

export const PACOTE_DIARIOS: PacoteParaDocumento = {
  modo: 'diarios',
  diarios: DIARIOS_DO_CONJUNTO,
};

export const PACOTE_COMPLETO: PacoteParaDocumento = {
  modo: 'consolidado-com-diarios',
  consolidado: CONSOLIDADO_DE_EXEMPLO,
  diarios: DIARIOS_DO_CONJUNTO,
};

export interface EspiaDeExportacaoDePeriodo {
  readonly registros: EventoDeExportacaoDePeriodo[];
  readonly portas: PortasDoExportDePeriodo;
}

export function criaPortasDoExportDePeriodo(
  pacote: PacoteParaDocumento = PACOTE_CONSOLIDADO,
  montaPacote?: PortasDoExportDePeriodo['montaPacote'],
  registraExportacao?: PortasDoExportDePeriodo['registraExportacao'],
): EspiaDeExportacaoDePeriodo {
  const registros: EventoDeExportacaoDePeriodo[] = [];
  return {
    registros,
    portas: {
      montaPacote:
        montaPacote ??
        ((): Promise<Result<PacoteParaDocumento, ErroDeDominio>> =>
          Promise.resolve(ok(pacote))),
      registraExportacao:
        registraExportacao ??
        ((eventos): Promise<Result<void, ErroDeDominio>> => {
          registros.push(...eventos);
          return Promise.resolve(ok(undefined));
        }),
      agora: () => MOMENTO,
    },
  };
}
