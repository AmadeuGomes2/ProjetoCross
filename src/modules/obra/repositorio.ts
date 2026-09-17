/**
 * Acesso ao banco do módulo `obra`.
 *
 * Possui `obra`, `periodo_bms`, `servico_controlado` e
 * `quantidade_projeto_versao` (docs/arquitetura/v1.md, 2.1, 2.2, 2.15 e 2.16).
 *
 * Nenhuma função de leitura existe sem `obraId` no argumento: é a segunda
 * camada da fronteira de confiança (arquitetura, 5.2, item 2).
 */

import { and, asc, desc, eq } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import {
  obra,
  periodoBms,
  quantidadeProjetoVersao,
  servicoControlado,
} from '../../db/schema';
import { diaPuroConfiavel, type DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type {
  ObraId,
  PeriodoBmsId,
  QuantidadeProjetoVersaoId,
  ServicoControladoId,
  UsuarioId,
} from '../../shared/id';

export interface LinhaDeObra {
  readonly id: ObraId;
  readonly contrato: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
  readonly escopo: string;
  readonly nomeProjeto: string;
  readonly area: string;
  readonly local: string;
  readonly respTecnicoNome: string | null;
  readonly respTecnicoTitulo: string | null;
  readonly respTecnicoCrea: string | null;
}

const colunasDaObra = {
  id: obra.id,
  contrato: obra.contrato,
  contratante: obra.contratante,
  contratada: obra.contratada,
  dataInicio: obra.dataInicio,
  dataTermino: obra.dataTermino,
  escopo: obra.escopo,
  nomeProjeto: obra.nomeProjeto,
  area: obra.area,
  local: obra.local,
  respTecnicoNome: obra.respTecnicoNome,
  respTecnicoTitulo: obra.respTecnicoTitulo,
  respTecnicoCrea: obra.respTecnicoCrea,
} as const;

export function buscaObra(db: BancoRdo, obraId: ObraId): LinhaDeObra | null {
  return db.select(colunasDaObra).from(obra).where(eq(obra.id, obraId)).get() ?? null;
}

export function insereObra(
  db: BancoRdo,
  dados: LinhaDeObra & { readonly criadoPor: UsuarioId; readonly criadoEm: Instante },
): void {
  db.insert(obra).values(dados).run();
}

export function atualizaCabecalho(
  db: BancoRdo,
  obraId: ObraId,
  dados: Omit<
    LinhaDeObra,
    'id' | 'respTecnicoNome' | 'respTecnicoTitulo' | 'respTecnicoCrea'
  >,
): void {
  db.update(obra).set(dados).where(eq(obra.id, obraId)).run();
}

export function atualizaResponsavelTecnico(
  db: BancoRdo,
  obraId: ObraId,
  nome: string,
  titulo: string,
  crea: string,
): void {
  db.update(obra)
    .set({ respTecnicoNome: nome, respTecnicoTitulo: titulo, respTecnicoCrea: crea })
    .where(eq(obra.id, obraId))
    .run();
}

export interface LinhaDePeriodo {
  readonly id: PeriodoBmsId;
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

export function listaPeriodos(db: BancoRdo, obraId: ObraId): LinhaDePeriodo[] {
  return db
    .select({
      id: periodoBms.id,
      numero: periodoBms.numero,
      dataInicial: periodoBms.dataInicial,
      dataFinal: periodoBms.dataFinal,
    })
    .from(periodoBms)
    .where(eq(periodoBms.obraId, obraId))
    .orderBy(asc(periodoBms.dataInicial))
    .all();
}

export function inserePeriodo(
  db: BancoRdo,
  dados: {
    readonly id: PeriodoBmsId;
    readonly obraId: ObraId;
    readonly numero: number;
    readonly dataInicial: DiaPuro;
    readonly dataFinal: DiaPuro;
    readonly criadoPor: UsuarioId;
    readonly criadoEm: Instante;
  },
): void {
  db.insert(periodoBms).values(dados).run();
}

/**
 * Troca as datas e o número de um período (17/09/2026).
 *
 * Não mexe em `criado_por` nem em `criado_em`: quem cadastrou continua sendo
 * quem cadastrou. Alteração de período não reescreve autoria.
 */
export function atualizaPeriodo(
  db: BancoRdo,
  obraId: ObraId,
  periodoId: PeriodoBmsId,
  dados: {
    readonly numero: number;
    readonly dataInicial: DiaPuro;
    readonly dataFinal: DiaPuro;
  },
): void {
  db.update(periodoBms)
    .set(dados)
    .where(and(eq(periodoBms.obraId, obraId), eq(periodoBms.id, periodoId)))
    .run();
}

/**
 * Apaga o período.
 *
 * **É a única exclusão física do sistema, e é segura por natureza**: período de
 * BM'S não é lançamento. Nada aponta para ele — o número do BM'S que sai no RDO
 * é resolvido por data, a cada consulta (`resolveBmsDoDia`), e não guardado na
 * linha do dia. Apagar o período faz os RDOs daqueles dias passarem a sair com
 * o campo vazio e aviso, que é o comportamento já definido pela decisão 21.1
 * para dia fora de período. **Nenhum lançamento se perde.**
 *
 * O `numero_rdo_congelado` do dia fechado continua onde estava: ele congela o
 * número do RDO, não o do BM'S.
 */
export function excluiPeriodo(
  db: BancoRdo,
  obraId: ObraId,
  periodoId: PeriodoBmsId,
): void {
  db.delete(periodoBms)
    .where(and(eq(periodoBms.obraId, obraId), eq(periodoBms.id, periodoId)))
    .run();
}

export interface LinhaDeServico {
  readonly id: ServicoControladoId;
  readonly nome: string;
  readonly ordem: number;
  readonly ativo: number;
}

export function listaServicos(db: BancoRdo, obraId: ObraId): LinhaDeServico[] {
  return db
    .select({
      id: servicoControlado.id,
      nome: servicoControlado.nome,
      ordem: servicoControlado.ordem,
      ativo: servicoControlado.ativo,
    })
    .from(servicoControlado)
    .where(eq(servicoControlado.obraId, obraId))
    .orderBy(asc(servicoControlado.ordem))
    .all();
}

export function buscaServico(
  db: BancoRdo,
  obraId: ObraId,
  servicoId: ServicoControladoId,
): LinhaDeServico | null {
  return (
    db
      .select({
        id: servicoControlado.id,
        nome: servicoControlado.nome,
        ordem: servicoControlado.ordem,
        ativo: servicoControlado.ativo,
      })
      .from(servicoControlado)
      .where(
        and(eq(servicoControlado.obraId, obraId), eq(servicoControlado.id, servicoId)),
      )
      .get() ?? null
  );
}

export function insereServico(
  db: BancoRdo,
  dados: {
    readonly id: ServicoControladoId;
    readonly obraId: ObraId;
    readonly nome: string;
    readonly nomeNormalizado: string;
    readonly ordem: number;
  },
): void {
  db.insert(servicoControlado)
    .values({ ...dados, ativo: 1 })
    .run();
}

export function insereVersaoDeQuantidade(
  db: BancoRdo,
  dados: {
    readonly id: QuantidadeProjetoVersaoId;
    readonly obraId: ObraId;
    readonly servicoId: ServicoControladoId;
    readonly quantidadeMilesimos: number;
    readonly definidoPor: UsuarioId;
    readonly definidoEm: Instante;
  },
): void {
  db.insert(quantidadeProjetoVersao).values(dados).run();
}

export interface LinhaDeVersao {
  readonly servicoId: ServicoControladoId;
  readonly quantidadeMilesimos: number;
  readonly definidoPor: UsuarioId;
  readonly definidoEm: Instante;
}

/**
 * Histórico completo de uma quantidade de projeto, da mais recente para a mais
 * antiga (R15). A **vigente é a primeira**: não existe cópia dela no serviço,
 * porque duas colunas com o mesmo número são duas verdades.
 */
export function listaVersoesDoServico(
  db: BancoRdo,
  obraId: ObraId,
  servicoId: ServicoControladoId,
): LinhaDeVersao[] {
  return db
    .select({
      servicoId: quantidadeProjetoVersao.servicoId,
      quantidadeMilesimos: quantidadeProjetoVersao.quantidadeMilesimos,
      definidoPor: quantidadeProjetoVersao.definidoPor,
      definidoEm: quantidadeProjetoVersao.definidoEm,
    })
    .from(quantidadeProjetoVersao)
    .where(
      and(
        eq(quantidadeProjetoVersao.obraId, obraId),
        eq(quantidadeProjetoVersao.servicoId, servicoId),
      ),
    )
    .orderBy(desc(quantidadeProjetoVersao.definidoEm))
    .all();
}

/** Todas as versões da obra, para montar a lista de serviços numa consulta só. */
export function listaVersoesDaObra(db: BancoRdo, obraId: ObraId): LinhaDeVersao[] {
  return db
    .select({
      servicoId: quantidadeProjetoVersao.servicoId,
      quantidadeMilesimos: quantidadeProjetoVersao.quantidadeMilesimos,
      definidoPor: quantidadeProjetoVersao.definidoPor,
      definidoEm: quantidadeProjetoVersao.definidoEm,
    })
    .from(quantidadeProjetoVersao)
    .where(eq(quantidadeProjetoVersao.obraId, obraId))
    .orderBy(desc(quantidadeProjetoVersao.definidoEm))
    .all();
}

export { diaPuroConfiavel };
