/**
 * Uma definição de "versão vigente" para o sistema inteiro.
 *
 * Arquitetura 2.18: a cadeia de retificação é linear — `UNIQUE (retifica_id)`
 * impede bifurcação — e a versão vigente é a linha da cadeia **sem sucessor**.
 * Toda leitura de lançamento passa por aqui. Se existirem duas definições de
 * vigente, o RDO passa a depender de qual consulta foi usada.
 *
 * São **duas** as razões de uma linha não valer, e as duas moram aqui:
 * ter sido retificada e ter sido excluída (decisão 30.1). Excluir não apaga a
 * linha, então quem lê o RDO precisa de um filtro — e é este. Espalhar
 * `excluido_em IS NULL` por cada consulta é a cláusula que alguém esquece, e o
 * esquecimento vira número errado num documento contratual.
 *
 * O que **não** passa por aqui, de propósito: o histórico (`cadeia`) e a busca
 * por rascunho. O histórico existe para mostrar o que existia, com o motivo; e
 * filtrar o rascunho faria o reenvio de um envio já excluído criar linha nova,
 * que o índice único de idempotência recusaria.
 */

import type { LancamentoId } from '../../shared/id';
import type { LinhaDeLancamento } from './tipos';

/** A linha foi excluída? Uma pergunta, um lugar. */
export function eExcluido(linha: LinhaDeLancamento): boolean {
  return linha.exclusao !== null;
}

export function apenasVigentes<L extends LinhaDeLancamento>(linhas: readonly L[]): L[] {
  const retificados = new Set<LancamentoId>();
  for (const linha of linhas) {
    if (linha.retificaId !== null) retificados.add(linha.retificaId);
  }
  return ordenaPelaOrigem(
    linhas.filter((l) => !retificados.has(l.id) && !eExcluido(l)),
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

/**
 * Esta versão é a que vale hoje?
 *
 * Duas condições: não ter sucessor na cadeia e não estar excluída. A segunda
 * existe para que "vigente" queira dizer a mesma coisa aqui e no RDO — a última
 * versão de uma cadeia excluída não aparece em documento nenhum, e chamá-la de
 * vigente no histórico contradiria o que o fiscal recebeu.
 */
export function eVigente(linha: LinhaDeLancamento, cadeia: readonly LinhaDeLancamento[]) {
  return !eExcluido(linha) && !cadeia.some((l) => l.retificaId === linha.id);
}
