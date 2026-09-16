/**
 * Taxonomia: as listas de domínio editáveis (R13), com **escopo de sistema**
 * (decisão 19.2).
 *
 * Não têm `obra_id`: um termo acrescentado numa obra vale para todas (CT-068).
 * Escopo por obra criaria 42 listas divergentes, que é o problema da planilha
 * em outra forma.
 */

import type { AmbienteBase } from '@/shared/contrato/ambiente';

/**
 * As três tabelas de taxonomia.
 *
 * **`condicao_tempo` não está aqui, e não é esquecimento:** a decisão 2.1, de
 * 16/09/2026, eliminou a condição de tempo de 6 termos. Sobrou a letra de
 * turno, que não é tabela — ver `LETRAS_DE_TURNO` em `shared/taxonomia` e a
 * decisão 5 da seção 7 da arquitetura.
 */
export const TIPOS_DE_TAXONOMIA = [
  'funcao',
  'tipo_equipamento',
  'status_atividade',
] as const;

export type TipoDeTaxonomia = (typeof TIPOS_DE_TAXONOMIA)[number];

export function ehTipoDeTaxonomia(valor: unknown): valor is TipoDeTaxonomia {
  return (
    typeof valor === 'string' && (TIPOS_DE_TAXONOMIA as readonly string[]).includes(valor)
  );
}

export interface Termo {
  readonly id: string;
  /** Grafia exata do cadastro, erros herdados inclusive. É o que se exibe. */
  readonly termo: string;
  readonly ordem: number;
  readonly ativo: boolean;
}

export type Ambiente = AmbienteBase;
