/**
 * Tipos do módulo `equipamento`.
 *
 * Mesma forma de `pessoal`, com duas diferenças que vêm do gabarito:
 *
 * - o bloco 6 do RDO agrega por **identificador** (`CF-29`, `RE-17`), não por
 *   tipo (R2). O tipo é cadastro interno e **não aparece no documento**
 *   (CT-049): imprimi-lo é divergência de layout;
 * - o identificador é **único dentro da obra**, não globalmente: uma frota
 *   real circula entre contratos (CT-043).
 */

import type { ComPortas } from '@/shared/contrato/ambiente';
import type { DiaPuro } from '../../shared/date/dia';
import type {
  EquipamentoId,
  ObraId,
  PassagemEquipamentoId,
  TipoEquipamentoId,
  UsuarioId,
} from '../../shared/id';

/** Porta para `taxonomia`. Devolve `null` se o tipo não existe; não cria nada. */
export type ResolveTipoEquipamento = (
  termo: string,
) => { id: TipoEquipamentoId; termo: string } | null;

export type Ambiente = ComPortas<{ resolveTipoEquipamento: ResolveTipoEquipamento }>;

export interface AtorDeEquipamento {
  readonly usuarioId: UsuarioId;
}

export interface ComandoCadastrarEquipamento {
  readonly obraId: ObraId;
  /** O que o RDO imprime. `CARRO LOC.` é valor real e precisa ser aceito. */
  readonly identificador: string;
  readonly tipoTermo: string;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export interface ComandoPassagemDeEquipamento {
  readonly obraId: ObraId;
  readonly equipamentoId: EquipamentoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export interface ComandoEncerrarPassagemDeEquipamento {
  readonly obraId: ObraId;
  readonly passagemId: PassagemEquipamentoId;
  readonly saida: DiaPuro;
}

export interface PassagemDeEquipamento {
  readonly id: PassagemEquipamentoId;
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

export interface EquipamentoComPassagens {
  readonly equipamentoId: EquipamentoId;
  readonly identificador: string;
  readonly tipoId: TipoEquipamentoId;
  readonly tipoTermo: string;
  readonly passagens: readonly PassagemDeEquipamento[];
}

/** Uma passagem como o RDO a recebe: só as duas datas, sem id de passagem. */
export interface PassagemMobilizada {
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/**
 * Uma coluna do bloco 6 do RDO. **Sem o tipo**, porque o tipo não vai ao
 * documento (CT-049).
 *
 * Note que **não há quantidade aqui**: este módulo entrega a mobilização crua
 * e o `rdo` conta. A agregação vive em `src/modules/rdo/efetivo.ts`, e só lá.
 */
export interface EquipamentoMobilizado {
  readonly equipamentoId: EquipamentoId;
  readonly identificador: string;
  /** Posição da coluna no bloco 6. Estável entre um RDO e o seguinte. */
  readonly ordem: number;
  readonly passagens: readonly PassagemMobilizada[];
}
