/**
 * Carga das telas de lançamento.
 *
 * A página do App Router é fina: chama isto e renderiza (`padroes-codigo`,
 * Estrutura). Nenhum `if` de regra de negócio mora numa página.
 *
 * Duas coisas acontecem aqui, e as duas são de fronteira:
 *
 * 1. A data vem da URL e é entrada hostil como qualquer outra: passa por
 *    `criaDiaPuro`, que recusa 31/09 e 29/02 de ano não bissexto.
 * 2. O ator vem do servidor. Enquanto a frente A não entrega a autenticação,
 *    a tela diz o que está faltando em vez de mostrar dado de obra.
 */

import { criaDiaPuro } from '../../shared/date/dia';
import { idConfiavel } from '../../shared/id';
import type { EstadoDoDia, LetraDeTurno } from '../../shared/taxonomia';
import {
  atorDaRequisicao,
  casosDeLancamento,
  portasDeLancamento,
} from '../_composicao/lancamento';

export interface DadosDaTela {
  readonly dataValida: boolean;
  readonly recado: string | null;
  readonly estado: 'nao_lancado' | EstadoDoDia;
  readonly diaFechado: boolean;
  readonly estadoSugerido: EstadoDoDia;
  readonly turnosSugeridos: {
    readonly noiteAnterior: LetraDeTurno | null;
    readonly manha: LetraDeTurno | null;
    readonly tarde: LetraDeTurno | null;
  };
  readonly sugestoesDeMotivo: readonly string[];
  readonly atividades: readonly {
    readonly id: string;
    readonly descricao: string;
    readonly statusTermo: string;
  }[];
  readonly observacoes: readonly { readonly id: string; readonly texto: string }[];
  readonly status: readonly { readonly id: string; readonly termo: string }[];
  readonly servicos: readonly { readonly id: string; readonly nome: string }[];
  readonly quantidadeDeProducao: number;
}

const SEM_TURNOS = { noiteAnterior: null, manha: null, tarde: null } as const;

function vazia(
  recado: string | null,
  dataValida: boolean,
  sugestoesDeMotivo: readonly string[] = [],
): DadosDaTela {
  return {
    dataValida,
    recado,
    estado: 'nao_lancado',
    diaFechado: false,
    estadoSugerido: 'trabalhado',
    turnosSugeridos: SEM_TURNOS,
    sugestoesDeMotivo,
    atividades: [],
    observacoes: [],
    status: [],
    servicos: [],
    quantidadeDeProducao: 0,
  };
}

export async function carregaDadosDaTela(
  obraIdBruto: string,
  dataBruta: string,
): Promise<DadosDaTela> {
  const data = criaDiaPuro(dataBruta);
  if (!data.ok) return vazia(data.erro.mensagem, false);

  const obraId = idConfiavel<'obra'>(obraIdBruto);
  const portas = portasDeLancamento();
  const casos = casosDeLancamento(portas);
  const sugestoesDeMotivo = await portas.sugestoesDeMotivo();

  const ator = await atorDaRequisicao();
  if (!ator.ok) return vazia(ator.erro.mensagem, true, sugestoesDeMotivo);

  const preenchimento = await casos.obtemPreenchimentoInicial(obraId, data.valor);
  if (!preenchimento.ok) {
    return vazia(preenchimento.erro.mensagem, true, sugestoesDeMotivo);
  }

  const atividades = await casos.listaAtividadesVigentes(obraId, data.valor);
  const observacoes = await casos.listaObservacoesVigentes(obraId, data.valor, 'CROS');
  const producao = await casos.somaProducaoDoDia(obraId, data.valor);
  const status = await portas.status.ativos();
  const servicos = await portas.servicos.daObra(obraId);

  return {
    dataValida: true,
    recado: null,
    estado: preenchimento.valor.estadoNaTela,
    diaFechado: preenchimento.valor.eDiaFechado,
    // O que se repete todo dia vem para confirmar. O dia já lançado abre com o
    // próprio estado; só o dia ainda não lançado herda o de ontem (15.1).
    estadoSugerido:
      preenchimento.valor.estadoNaTela === 'nao_lancado'
        ? (preenchimento.valor.estadoSugerido ?? 'trabalhado')
        : preenchimento.valor.estadoNaTela,
    turnosSugeridos: preenchimento.valor.turnosSugeridos ?? SEM_TURNOS,
    sugestoesDeMotivo,
    atividades: atividades.ok
      ? atividades.valor.map((a) => ({
          id: String(a.id),
          descricao: a.descricao,
          statusTermo: a.statusTermo,
        }))
      : [],
    observacoes: observacoes.ok
      ? observacoes.valor.map((o) => ({ id: String(o.id), texto: o.texto }))
      : [],
    status: status.map((s) => ({ id: String(s.id), termo: s.termo })),
    servicos: servicos.map((s) => ({ id: String(s.id), nome: s.nome })),
    quantidadeDeProducao: producao.ok ? producao.valor.length : 0,
  };
}
