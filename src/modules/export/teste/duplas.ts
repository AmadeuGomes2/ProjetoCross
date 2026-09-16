/**
 * Duplas de teste do módulo `export`.
 *
 * Dado sintético (CLAUDE.md, Segurança): "P1", "MT-26", "R1" são rótulos
 * inventados. O RDO de exemplo é o de 03/09/2026, número 210, que é o contexto
 * comum dos casos CT-237 a CT-265.
 */

import { diaPuroConfiavel } from '../../../shared/date/dia';
import type { Instante } from '../../../shared/date/fuso';
import { idConfiavel, type ObraId, type UsuarioId } from '../../../shared/id';
import { ok, type Result, type ErroDeDominio } from '../../../shared/result';
import type {
  AtorDaExportacao,
  EventoDeExportacao,
  PortasDoExport,
  RdoParaDocumento,
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
export const MOMENTO: Instante = '2026-09-03T18:00:00.000Z';

export const RDO_DE_EXEMPLO: RdoParaDocumento = {
  identificacao: {
    dia: diaPuroConfiavel('2026-09-03'),
    data: '03/09/2026',
    diaDaSemana: 'Quinta-Feira',
    bms: '7',
    numeroDoRdo: 210,
  },
  informacoesGerais: {
    contrato: 'P0476/01-25 - BLOCO 02',
    dataInicio: '05/02/2026',
    dataFinal: '05/02/2027',
    contratante: 'PREFEITURA MUNICIPAL DE MONTES CLAROS - MG',
    contratada: 'CROS CONSTRUÇÕES S.A.',
    escopo: 'EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO',
  },
  caracteristicas: {
    nome: 'SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02',
    area: 'MONTES CLAROS - MG',
    local: 'VIAS URBANAS  DA CIDADE MONTES CLAROS - MG',
  },
  efetivoPessoal: {
    pagina1: [
      { chave: 'f-1', rotulo: 'Motorista', quantidade: '2' },
      { chave: 'f-2', rotulo: 'Topografo', quantidade: '' },
    ],
    continuacao: [],
    total: '2',
  },
  efetivoEquipamentos: {
    pagina1: [{ chave: 'e-1', rotulo: 'MT-26', quantidade: '1' }],
    continuacao: [],
    total: '1',
  },
  producao: [
    {
      chave: 's-1',
      servico: 'REC.(FRESA+CAPA)',
      exec: '234,50',
      acum: '15.027,03',
      projeto: '2.210,39',
      percentual: '55,85%',
      fracao: 0.5585,
    },
    {
      chave: 's-3',
      servico: 'RECICLAGEM(BASE+CAPA)',
      exec: '-',
      acum: '-',
      projeto: '1.000,00',
      percentual: '0,00%',
      fracao: 0,
    },
  ],
  atividades: {
    pagina1: [{ chave: 'a-1', descricao: 'Fresagem', status: 'Produção' }],
    continuacao: [],
  },
  pluviometria: { noiteAnterior: 'C', manha: 'B', tarde: 'B', indice: '12 mm' },
  comentariosCros: { pagina1: ['Frente liberada'], continuacao: [] },
  responsavelTecnico: {
    nome: 'R1',
    titulo: 'Engenheiro Civil',
    registro: 'CREA - MG 000000/D',
  },
  temContinuacao: false,
};

export interface EspiaDeExportacao {
  readonly registros: EventoDeExportacao[];
  readonly portas: PortasDoExport;
}

export function criaPortasDoExport(
  rdo: RdoParaDocumento = RDO_DE_EXEMPLO,
  montaRdo?: PortasDoExport['montaRdo'],
): EspiaDeExportacao {
  const registros: EventoDeExportacao[] = [];
  return {
    registros,
    portas: {
      montaRdo:
        montaRdo ??
        ((): Promise<Result<RdoParaDocumento, ErroDeDominio>> =>
          Promise.resolve(ok(rdo))),
      registraExportacao: (evento) => {
        registros.push(evento);
        return Promise.resolve(ok(undefined));
      },
      agora: () => MOMENTO,
    },
  };
}

export function usuario(rotulo: string): UsuarioId {
  return idConfiavel(rotulo);
}
