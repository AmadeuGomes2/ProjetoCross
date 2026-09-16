/**
 * Ambiente de execução de um caso de uso.
 *
 * Existe aqui, e não dentro de cada módulo, por um motivo concreto: na primeira
 * integração das três frentes havia **cinco cópias** da mesma forma, em
 * `acesso`, `obra`, `pessoal`, `equipamento` e `taxonomia`. Nenhuma frente
 * errou ao criar a sua, porque `src/shared/` exige perguntar antes de tocar, e
 * elas estavam proibidas de fazê-lo. Mas cinco definições estruturalmente
 * iguais divergem na terceira semana, e aí o relógio de um módulo passa a
 * andar diferente do relógio do outro.
 *
 * `docs/arquitetura/v1.md`, seção 3: tudo que cruza fronteira de módulo mora em
 * `src/shared/contrato/`, e são **só tipos**, sem runtime.
 *
 * O relógio é injetado, e não lido de `Date.now()` dentro da regra, porque
 * teste não pode depender do horário real (`padroes-codigo`, Testes) e porque
 * "hoje" é o hoje do fuso da obra, nunca o do servidor.
 */

import type { BancoRdo } from '@/db';

/** O mínimo que todo caso de uso precisa. Cada módulo estende com as suas portas. */
export interface AmbienteBase {
  readonly db: BancoRdo;
  readonly relogio: () => Date;
}

/**
 * Ambiente de um módulo: a base, mais as portas que só ele consome.
 *
 * Uso: `type Ambiente = ComPortas<{ concedeAcesso: ConcedeAcesso }>`.
 * Assim a base é uma definição só e a parte específica continua no módulo,
 * que é onde ela pertence.
 */
export type ComPortas<Portas extends Record<string, unknown> = Record<string, never>> =
  AmbienteBase & Readonly<Portas>;
