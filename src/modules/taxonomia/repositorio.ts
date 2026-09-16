/**
 * Acesso ao banco do módulo `taxonomia`.
 *
 * Possui `funcao`, `tipo_equipamento`, `status_atividade` e
 * `sugestao_motivo_parada` (docs/arquitetura/v1.md, 2.7 a 2.10). Nenhuma outra.
 */

import { asc, eq, sql } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import {
  funcao,
  statusAtividade,
  sugestaoMotivoParada,
  tipoEquipamento,
} from '../../db/schema';
import type { Instante } from '../../shared/date/fuso';
import { geraId } from '../../shared/id';
import { chaveDeTermo } from '../../shared/taxonomia';
import type { Termo, TipoDeTaxonomia } from './tipos';

/** A tabela de cada tipo. Uma tabela por taxonomia, decisão 6 da seção 7. */
function tabelaDe(tipo: TipoDeTaxonomia) {
  switch (tipo) {
    case 'funcao':
      return funcao;
    case 'tipo_equipamento':
      return tipoEquipamento;
    case 'status_atividade':
      return statusAtividade;
  }
}

export function listaTermosDaTabela(db: BancoRdo, tipo: TipoDeTaxonomia): Termo[] {
  const t = tabelaDe(tipo);
  return db
    .select({ id: t.id, termo: t.termo, ordem: t.ordem, ativo: t.ativo })
    .from(t)
    .orderBy(asc(t.ordem))
    .all()
    .map((linha) => ({
      id: linha.id,
      termo: linha.termo,
      ordem: linha.ordem,
      ativo: linha.ativo === 1,
    }));
}

/**
 * Busca pela **chave normalizada**, nunca por igualdade exata de texto.
 *
 * É o caso de teste obrigatório 13: `" perca de Produção "` tem de encontrar
 * `"Perca de produção"`. No Excel a comparação ignora caixa e o defeito não
 * aparece; em código, aparece.
 */
export function buscaPorChave(
  db: BancoRdo,
  tipo: TipoDeTaxonomia,
  bruto: string,
): Termo | null {
  const t = tabelaDe(tipo);
  const linha = db
    .select({ id: t.id, termo: t.termo, ordem: t.ordem, ativo: t.ativo })
    .from(t)
    .where(eq(t.termoNormalizado, chaveDeTermo(bruto)))
    .get();
  if (linha === undefined) return null;
  return {
    id: linha.id,
    termo: linha.termo,
    ordem: linha.ordem,
    ativo: linha.ativo === 1,
  };
}

export function proximaOrdem(db: BancoRdo, tipo: TipoDeTaxonomia): number {
  const t = tabelaDe(tipo);
  const linha = db
    .select({ maior: sql<number | null>`max(${t.ordem})` })
    .from(t)
    .get();
  return (linha?.maior ?? 0) + 1;
}

interface TermoNovo {
  readonly termo: string;
  readonly termoNormalizado: string;
  readonly ordem: number;
  readonly criadoEm: Instante;
}

/**
 * Insere e devolve o id.
 *
 * O `switch` existe porque cada tabela tem o **seu** tipo de marca de
 * identificador, e é essa marca que impede passar um id de status onde se
 * espera um de função. Um insert genérico só compilaria com `as`, que o projeto
 * proíbe (padroes-codigo, Tipos). Três linhas repetidas valem menos que um
 * `as`.
 */
export function insereTermo(
  db: BancoRdo,
  tipo: TipoDeTaxonomia,
  dados: TermoNovo,
): string {
  switch (tipo) {
    case 'funcao': {
      const id = geraId<'funcao'>();
      db.insert(funcao)
        .values({ id, ...dados, ativo: 1 })
        .run();
      return id;
    }
    case 'tipo_equipamento': {
      const id = geraId<'tipo_equipamento'>();
      db.insert(tipoEquipamento)
        .values({ id, ...dados, ativo: 1 })
        .run();
      return id;
    }
    case 'status_atividade': {
      const id = geraId<'status_atividade'>();
      db.insert(statusAtividade)
        .values({ id, ...dados, ativo: 1 })
        .run();
      return id;
    }
  }
}

export function listaSugestoes(db: BancoRdo): string[] {
  return db
    .select({ texto: sugestaoMotivoParada.texto })
    .from(sugestaoMotivoParada)
    .where(eq(sugestaoMotivoParada.ativo, 1))
    .orderBy(asc(sugestaoMotivoParada.ordem))
    .all()
    .map((linha) => linha.texto);
}
