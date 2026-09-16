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
export type ResolveFuncao = (termo: string) => { id: FuncaoId; termo: string } | null;

export type Ambiente = ComPortas<{ resolveFuncao: ResolveFuncao }>;

export interface AtorDePessoal {
  readonly usuarioId: UsuarioId;
}

export interface ComandoCadastrarPessoa {
  readonly obraId: ObraId;
  /** **Dado pessoal.** Só o engenheiro da obra lê; nunca sai no RDO. */
  readonly nome: string;
  /** Texto escolhido na lista; vira referência ao cadastro (R13). */
  readonly funcaoTermo: string;
  readonly entrada: DiaPuro;
  /** Nulo = ainda na obra. */
  readonly saida: DiaPuro | null;
}

export interface ComandoPassagem {
  readonly obraId: ObraId;
  readonly pessoaId: PessoaId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export interface ComandoEncerrarPassagem {
  readonly obraId: ObraId;
  readonly passagemId: PassagemPessoaId;
  readonly saida: DiaPuro;
}

export interface Passagem {
  readonly id: PassagemPessoaId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/** Resposta **só para o engenheiro**: carrega nome. Ver a tabela "Quem usa". */
export interface PessoaComPassagens {
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly funcaoId: FuncaoId;
  readonly funcaoTermo: string;
  readonly passagens: readonly Passagem[];
}

/**
 * Uma passagem pela obra, como o RDO a recebe: só as duas datas.
 *
 * Sem `id`, porque quem agrega não precisa dele e identificador de passagem
 * numa resposta é superfície a mais.
 */
export interface PassagemMobilizada {
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
  readonly funcaoId: FuncaoId;
  readonly passagens: readonly PassagemMobilizada[];
}
