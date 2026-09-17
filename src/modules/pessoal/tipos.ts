/**
 * Tipos do módulo `pessoal`.
 *
 * **`pessoa` é a tabela mais sensível do sistema** (LGPD): a planilha real tem
 * 19 nomes completos com função e data de admissão. O RDO agrega por
 * **função** e nunca mostra nome (R2).
 *
 * Repare em `EfetivoPorFuncao`: ele **não tem campo de nome**. O vazamento é
 * impossível pelo tipo, não por disciplina de quem escreve a tela
 * (docs/arquitetura/v1.md, 4.4).
 */

import type { ComPortas } from '@/shared/contrato/ambiente';
import type { DiaPuro } from '../../shared/date/dia';
import type {
  FuncaoId,
  ObraId,
  PassagemPessoaId,
  PessoaId,
  UsuarioId,
} from '../../shared/id';

/**
 * Porta para `taxonomia`: a função existe no cadastro?
 *
 * Devolve `null` quando não existe. **Não cria termo por efeito colateral**
 * (CT-037): foi assim que a planilha ganhou `Servente ` e `Servente` como duas
 * funções diferentes.
 */
/**
 * Resolve o termo contra a taxonomia cadastrada.
 *
 * Assíncrona desde 17/09/2026: a taxonomia passou a ler do Postgres, e quem
 * declara a porta acompanha o que a implementação consegue cumprir. Manter a
 * assinatura síncrona obrigaria a raiz de composição a inventar um adaptador
 * que não existe — não há como esperar uma promessa dentro de uma função
 * síncrona sem bloquear o processo.
 */
export type ResolveFuncao = (
  termo: string,
) => Promise<{ id: FuncaoId; termo: string } | null>;

export type Ambiente = ComPortas<{ resolveFuncao: ResolveFuncao }>;

export interface AtorDePessoal {
  readonly usuarioId: UsuarioId;
}

export interface ComandoCadastrarPessoa {
  readonly obraId: ObraId;
  /** **Dado pessoal.** Só quem tem acesso à obra lê; nunca sai no RDO. */
  readonly nome: string;
  /**
   * Texto escolhido na lista; vira referência ao cadastro (R13).
   *
   * É a função da **primeira passagem**, não um atributo da pessoa (decisão
   * 29.1): cadastrar abre a passagem, e é a passagem que tem função.
   */
  readonly funcaoTermo: string;
  readonly entrada: DiaPuro;
  /** Nulo = ainda na obra. */
  readonly saida: DiaPuro | null;
}

export interface ComandoPassagem {
  readonly obraId: ObraId;
  readonly pessoaId: PessoaId;
  /** Obrigatória: quem volta à obra pode voltar em outra função (29.1). */
  readonly funcaoTermo: string;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export interface ComandoEncerrarPassagem {
  readonly obraId: ObraId;
  readonly passagemId: PassagemPessoaId;
  readonly saida: DiaPuro;
}

/**
 * Troca de função: encerra a passagem vigente e abre outra (decisão 29.1).
 *
 * Não existe "atualizar a função da passagem". Atualizar reescreveria o efetivo
 * dos dias que a passagem já cobriu, que é justamente o defeito que a decisão
 * corrige.
 */
export interface ComandoTrocarFuncao {
  readonly obraId: ObraId;
  readonly pessoaId: PessoaId;
  /** A função nova. Texto da lista, resolvido contra o cadastro (R13). */
  readonly funcaoTermo: string;
  /**
   * **Primeiro dia na função nova.** A passagem antiga é encerrada na véspera,
   * porque a saída é o último dia trabalhado (decisão 1.1).
   */
  readonly aPartirDe: DiaPuro;
}

export interface Passagem {
  readonly id: PassagemPessoaId;
  /** A função **desta** passagem (29.1), e não do cadastro da pessoa. */
  readonly funcaoId: FuncaoId;
  readonly funcaoTermo: string;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/**
 * Resposta **só para o engenheiro**: carrega nome. Ver a tabela "Quem usa".
 *
 * Sem `funcaoTermo` no topo, de propósito: a mesma pessoa pode ter passado pela
 * obra como Motorista e voltado como Operador II, e não existe "a função dela"
 * (decisão 29.1). Cada passagem traz a sua.
 */
export interface PessoaComPassagens {
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly passagens: readonly Passagem[];
}

/**
 * Uma passagem pela obra, como o RDO a recebe: a função e as duas datas.
 *
 * Sem `id`, porque quem agrega não precisa dele e identificador de passagem
 * numa resposta é superfície a mais.
 *
 * A função vem aqui, e não na pessoa, porque é aqui que ela é verdade
 * (decisão 29.1): o efetivo de um dia lê a função da passagem que cobre
 * aquele dia.
 */
export interface PassagemMobilizada {
  readonly funcaoId: FuncaoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/**
 * Sem campo de nome, de propósito. É o que alimenta o bloco 5 do RDO.
 *
 * Note que **não há quantidade aqui**: este módulo entrega a mobilização crua
 * e o `rdo` conta. Havia duas contagens de efetivo no sistema, e a divergência
 * entre elas era a mesma que a planilha legada tinha entre duas faixas de
 * coluna. Agora existe uma só, em `src/modules/rdo/efetivo.ts`.
 */
export interface PessoaMobilizada {
  readonly pessoaId: PessoaId;
  readonly passagens: readonly PassagemMobilizada[];
}
