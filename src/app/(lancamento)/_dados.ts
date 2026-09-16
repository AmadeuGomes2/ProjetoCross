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
 * 2. O ator vem do servidor **e o acesso à obra é verificado aqui**, com a
 *    mesma porta que as escritas já usavam. Conferir só que existe sessão
 *    deixava o encarregado da obra A ler atividade e observação da obra B com
 *    o id na URL — foi o CRÍTICO 2 do laudo de segurança de 16/09/2026. Os
 *    casos de uso de leitura não autorizam de propósito: a autorização é de
 *    quem chama, e quem chama é este arquivo.
 */

import { redirect } from 'next/navigation';

import { criaDiaPuro } from '../../shared/date/dia';
import { idConfiavel } from '../../shared/id';
import type { EstadoDoDia, LetraDeTurno } from '../../shared/taxonomia';
import { casosDeLancamento, portasDeLancamento } from '../_composicao/lancamento';
import { atorDaRequisicaoOuRecusa } from '../_composicao/sessao';

/** A porta de entrada, a mesma de `(cadastro)` e de `(rdo)`. */
export const ENTRADA = '/entrar';

/**
 * Quem lê o portador da requisição. Injetável só para teste: em produção é
 * sempre o cookie, e o perfil nunca vem dele.
 */
export type LeitorDeAtor = typeof atorDaRequisicaoOuRecusa;

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

/**
 * O nome diz o que a função garante: **ela autoriza**. É o que as páginas de
 * `(cadastro)` já faziam com as funções `*Protegida`, e é o que
 * `rotas-protegidas.test.ts` procura na página que recebe `obraId`.
 */
export async function carregaDadosDaTelaProtegida(
  obraIdBruto: string,
  dataBruta: string,
  leAtor: LeitorDeAtor = atorDaRequisicaoOuRecusa,
): Promise<DadosDaTela> {
  // Decisão 36.1: **sem sessão, redireciona**, como todas as outras telas
  // protegidas já faziam. Responder 200 com "sua sessão terminou" faz
  // monitoramento e cache lerem "página entregue" onde houve sessão expirada —
  // e os dois leem o código, não a mensagem.
  //
  // Antes de tudo: quem não entrou não recebe nem a validação da data nem uma
  // consulta ao banco.
  const ator = await leAtor();
  if (!ator.ok) redirect(ENTRADA);

  const data = criaDiaPuro(dataBruta);
  if (!data.ok) return vazia(data.erro.mensagem, false);

  const obraId = idConfiavel<'obra'>(obraIdBruto);
  const portas = portasDeLancamento();
  const casos = casosDeLancamento(portas);
  const sugestoesDeMotivo = await portas.sugestoesDeMotivo();

  // A leitura passa pela mesma fronteira da escrita. `lancar` é o perfil
  // mínimo `encarregado`: os dois perfis leem a tela do dia.
  const acesso = await portas.exigeAcessoNaObra(ator.valor, obraId, 'lancar');
  if (!acesso.ok) return vazia(acesso.erro.mensagem, true, sugestoesDeMotivo);

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
