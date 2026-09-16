/**
 * Raiz de composição do RDO diário.
 *
 * `docs/arquitetura/v1.md`, 4.1: o módulo consumidor declara a **porta**; o
 * módulo produtor exporta uma função com a mesma forma; a ligação acontece
 * aqui, e este é o único lugar que importa de mais de um módulo. Pasta com `_`
 * não vira rota no App Router.
 *
 * **Estado: as portas ainda não estão ligadas.** As implementações vêm das
 * frentes A e B, que correm em paralelo. Enquanto não chegam, cada porta
 * devolve um erro de domínio — nunca um dado inventado, porque RDO com dado
 * falso é pior que RDO ausente.
 *
 * O que ligar, quando A e B entregarem (uma linha cada):
 *
 * | Porta                      | Frente | Função esperada                          |
 * | -------------------------- | ------ | ---------------------------------------- |
 * | `cabecalho`                | A      | `obra.obtemCabecalhoDaObra`              |
 * | `bms`                      | A      | `obra.resolveBmsDoDia`                   |
 * | `funcoes`                  | A      | `taxonomia.listaFuncoesParaEfetivo`      |
 * | `pessoalMobilizado`        | A      | `pessoal.listaMobilizacao` (sem nome)    |
 * | `equipamentosMobilizados`  | A      | `equipamento.listaMobilizacao`           |
 * | `servicos`                 | A      | `obra.listaServicosControlados`          |
 * | `dia`                      | B      | `lancamento.obtemDiaDeObra`              |
 * | `lancamentosDeProducaoAte` | B      | `lancamento.listaProducaoVigenteAte`     |
 * | `atividades`               | B      | `lancamento.listaAtividadesVigentes`     |
 * | `pluviometria`             | B      | `lancamento.obtemPluviometriaVigente`    |
 * | `observacoesCros`          | B      | `lancamento.listaObservacoesVigentes`    |
 *
 * Duas exigências para quem for ligar: `pessoalMobilizado` **não** devolve nome
 * de pessoa, e `atividades` **não** devolve autor. Os tipos das portas já
 * impedem os dois; é só não contorná-los.
 */

import { consultaRdoDiario } from '../../modules/rdo/borda/consulta-rdo';
import type { ErroDeConsultaDoRdo } from '../../modules/rdo/borda/consulta-rdo';
import type { PortasDoRdo } from '../../modules/rdo/portas';
import type { RdoDiario } from '../../modules/rdo/tipos';
import { CODIGO_ERRO, erro, erroDeDominio, type Result } from '../../shared/result';

const MENSAGEM_NAO_LIGADO =
  'O cadastro da obra e os lançamentos do dia ainda não estão disponíveis nesta instalação.';

function portaPendente<T>(): Promise<Result<T, ReturnType<typeof erroDeDominio>>> {
  return Promise.resolve(
    erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, MENSAGEM_NAO_LIGADO)),
  );
}

export const portasDoRdo: PortasDoRdo = {
  cabecalho: () => portaPendente(),
  bms: () => portaPendente(),
  dia: () => portaPendente(),
  funcoes: () => portaPendente(),
  pessoalMobilizado: () => portaPendente(),
  equipamentosMobilizados: () => portaPendente(),
  servicos: () => portaPendente(),
  lancamentosDeProducaoAte: () => portaPendente(),
  atividades: () => portaPendente(),
  pluviometria: () => portaPendente(),
  observacoesCros: () => portaPendente(),
};

export function consultaRdoDaObra(
  bruto: unknown,
): Promise<Result<RdoDiario, ErroDeConsultaDoRdo>> {
  return consultaRdoDiario(bruto, portasDoRdo);
}
