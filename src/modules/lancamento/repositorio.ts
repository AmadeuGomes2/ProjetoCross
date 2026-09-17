/**
 * Porta de persistência do módulo `lancamento`.
 *
 * O módulo possui cinco tabelas — `dia_de_obra` e as quatro de lançamento — e
 * **não lê nenhuma outra** (arquitetura 4.1, item 4). Toda consulta recebe
 * `obraId` como argumento obrigatório: não existe leitura sem filtro de obra,
 * que é a segunda camada da fronteira de confiança (arquitetura 5.2).
 *
 * As quatro coleções têm a mesma forma de propósito. Uma regra, quatro tabelas,
 * uma interface: assim a cadeia de retificação e a idempotência do rascunho não
 * podem existir em três versões divergentes.
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { LancamentoId, ObraId, UsuarioId } from '../../shared/id';
import type {
  DiaDeObra,
  Exclusao,
  LinhaDeAtividade,
  LinhaDeLancamento,
  LinhaDeObservacao,
  LinhaDePluviometria,
  LinhaDeProducao,
} from './tipos';

/**
 * Uma coleção devolve **todas as versões**, inclusive as retificadas. Quem
 * decide o que é vigente é `apenasVigentes()`, em um lugar só.
 */
export interface Colecao<L extends LinhaDeLancamento> {
  doDia(obraId: ObraId, data: DiaPuro): Promise<L[]>;
  porId(obraId: ObraId, id: LancamentoId): Promise<L | null>;
  cadeia(obraId: ObraId, raizId: LancamentoId): Promise<L[]>;
  /** Reenvio do mesmo rascunho não duplica (arquitetura, decisão 18). */
  porRascunho(autorId: UsuarioId, chave: string): Promise<L | null>;
  grava(linha: L): Promise<void>;
  /** Correção em dia aberto. Em dia fechado não existe: só retificação. */
  atualiza(linha: L): Promise<void>;
  /**
   * Exclusão **com rastro** (decisão 30.1): marca a linha, nunca a apaga.
   *
   * Não existe `DELETE` neste repositório. O nome diz o que acontece de fato,
   * para que nenhuma implementação futura leia "exclui" e chame `DELETE` num
   * lançamento que já foi entregue ao fiscal.
   */
  marcaExcluido(obraId: ObraId, id: LancamentoId, exclusao: Exclusao): Promise<void>;
}

export interface ColecaoDeProducao extends Colecao<LinhaDeProducao> {
  /**
   * Base do acumulado: todas as linhas com `data <= ate`, recalculadas do zero
   * em toda consulta. Não existe tabela de saldo nem coluna de acumulado.
   */
  ate(obraId: ObraId, ate: DiaPuro): Promise<LinhaDeProducao[]>;
}

export interface RepositorioDeLancamento {
  readonly dia: {
    /** Devolve `null` quando o dia é `não lançado` — que é ausência de linha. */
    obtem(obraId: ObraId, data: DiaPuro): Promise<DiaDeObra | null>;
    /**
     * Os dias declarados dentro de um intervalo fechado, para o painel da obra.
     *
     * Devolve **só o que existe**: dia sem linha não vem, e quem monta o painel
     * o marca como `nao_lancado` (`painel.ts`, decisão 4.2). Preencher a
     * ausência aqui apagaria a diferença entre ninguém ter lançado e alguém ter
     * lançado que não houve trabalho.
     */
    naJanela(obraId: ObraId, de: DiaPuro, ate: DiaPuro): Promise<DiaDeObra[]>;
    salva(dia: DiaDeObra): Promise<void>;
  };
  readonly atividades: Colecao<LinhaDeAtividade>;
  readonly producao: ColecaoDeProducao;
  readonly pluviometria: Colecao<LinhaDePluviometria>;
  readonly observacoes: Colecao<LinhaDeObservacao>;
  /**
   * Tudo ou nada. O primeiro lançamento do dia cria a linha de `dia_de_obra` na
   * mesma transação: sem isso, um lançamento recusado deixaria para trás um dia
   * declarado que ninguém declarou.
   */
  executaEmTransacao<T>(operacao: () => Promise<T>): Promise<T>;
}
