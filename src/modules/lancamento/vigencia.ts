/**
 * Uma definição de "versão vigente" para o sistema inteiro.
 *
 * Arquitetura 2.18: a cadeia de retificação é linear — `UNIQUE (retifica_id)`
 * impede bifurcação — e a versão vigente é a linha da cadeia **sem sucessor**.
 * Toda leitura de lançamento passa por aqui. Se existirem duas definições de
 * vigente, o RDO passa a depender de qual consulta foi usada.
 */

import type { LancamentoId } from '../../shared/id';
import type { LinhaDeLancamento } from './tipos';

export function apenasVigentes<L extends LinhaDeLancamento>(linhas: readonly L[]): L[] {
  const retificados = new Set<LancamentoId>();
  for (const linha of linhas) {
    if (linha.retificaId !== null) retificados.add(linha.retificaId);
  }
  return ordenaPelaOrigem(
    linhas.filter((l) => !retificados.has(l.id)),
    linhas,
  );
}

/**
 * Ordem do bloco 8: hora de registro do ORIGINAL da cadeia, e depois o id.
 *
 * Ordenar pela hora da retificação jogaria a atividade corrigida para o fim da
 * lista, e o RDO mudaria de ordem entre duas exportações do mesmo dia — que é
 * exatamente o que o fiscal percebe. O desempate por id garante que duas
 * exportações produzam o mesmo documento.
 */
export function ordenaPelaOrigem<L extends LinhaDeLancamento>(
  aOrdenar: readonly L[],
  todas: readonly L[],
): L[] {
  const origem = new Map<LancamentoId, { em: string; id: string }>();
  for (const linha of todas) {
    if (linha.id === linha.raizId) {
      origem.set(linha.raizId, { em: linha.registradoEm, id: linha.id });
    }
  }
  const chave = (linha: L) =>
    origem.get(linha.raizId) ?? { em: linha.registradoEm, id: linha.id };
  return [...aOrdenar].sort((a, b) => {
    const ca = chave(a);
    const cb = chave(b);
    if (ca.em !== cb.em) return ca.em < cb.em ? -1 : 1;
    if (ca.id !== cb.id) return ca.id < cb.id ? -1 : 1;
    // Mesma cadeia: a retificação vem depois do original.
    return a.registradoEm < b.registradoEm ? -1 : 1;
  });
}

/** A linha da cadeia que vale hoje, ou `null` quando a cadeia está vazia. */
export function vigenteDaCadeia<L extends LinhaDeLancamento>(
  cadeia: readonly L[],
): L | null {
  return apenasVigentes(cadeia)[0] ?? null;
}

export function eVigente(linha: LinhaDeLancamento, cadeia: readonly LinhaDeLancamento[]) {
  return !cadeia.some((l) => l.retificaId === linha.id);
}
