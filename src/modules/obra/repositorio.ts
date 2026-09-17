/**
 * Acesso ao banco do módulo `obra`.
 *
 * Possui `obra`, `periodo_bms`, `servico_controlado` e
 * `quantidade_projeto_versao` (docs/arquitetura/v1.md, 2.1, 2.2, 2.15 e 2.16).
 *
 * Nenhuma função de leitura existe sem `obraId` no argumento: é a segunda
 * camada da fronteira de confiança (arquitetura, 5.2, item 2).
 *
 * ## Assíncrono desde 17/09/2026
 *
 * O banco virou Postgres, no Neon, e o driver fala pela rede: toda função daqui
 * devolve `Promise`. O `.get()`, o `.all()` e o `.run()` do `better-sqlite3` não
 * existem neste dialeto — a busca de uma linha vira `limit(1)` mais o primeiro
 * elemento, e a de muitas é o próprio `await` do construtor de consulta.
 *
 * `limit(1)` em vez de trazer tudo e pegar o primeiro: o que se paga agora é
 * rede, não memória do processo.
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

export async function buscaObra(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeObra | null> {
  const linhas = await db
    .select(colunasDaObra)
    .from(obra)
    .where(eq(obra.id, obraId))
    .limit(1);
  return linhas[0] ?? null;
}

export async function insereObra(
  db: BancoRdo,
  dados: LinhaDeObra & { readonly criadoPor: UsuarioId; readonly criadoEm: Instante },
): Promise<void> {
  await db.insert(obra).values(dados);
}

export async function atualizaCabecalho(
  db: BancoRdo,
  obraId: ObraId,
  dados: Omit<
    LinhaDeObra,
    'id' | 'respTecnicoNome' | 'respTecnicoTitulo' | 'respTecnicoCrea'
  >,
): Promise<void> {
  await db.update(obra).set(dados).where(eq(obra.id, obraId));
}

export async function atualizaResponsavelTecnico(
  db: BancoRdo,
  obraId: ObraId,
  nome: string,
  titulo: string,
  crea: string,
): Promise<void> {
  await db
    .update(obra)
    .set({ respTecnicoNome: nome, respTecnicoTitulo: titulo, respTecnicoCrea: crea })
    .where(eq(obra.id, obraId));
}

export interface LinhaDePeriodo {
  readonly id: PeriodoBmsId;
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

/**
 * Os períodos da obra, do mais antigo para o mais recente.
 *
 * `data_inicial` é `DATE` desde 17/09/2026: a ordenação passou a ser
 * cronológica de verdade, e não mais por coincidência lexicográfica do texto
 * `AAAA-MM-DD`. O resultado é o mesmo; a garantia, não.
 */
export async function listaPeriodos(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDePeriodo[]> {
  return db
    .select({
      id: periodoBms.id,
      numero: periodoBms.numero,
      dataInicial: periodoBms.dataInicial,
      dataFinal: periodoBms.dataFinal,
    })
    .from(periodoBms)
    .where(eq(periodoBms.obraId, obraId))
    .orderBy(asc(periodoBms.dataInicial));
}

export async function inserePeriodo(
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
): Promise<void> {
  await db.insert(periodoBms).values(dados);
}

/**
 * Troca as datas e o número de um período (17/09/2026).
 *
 * Não mexe em `criado_por` nem em `criado_em`: quem cadastrou continua sendo
 * quem cadastrou. Alteração de período não reescreve autoria.
 */
export async function atualizaPeriodo(
  db: BancoRdo,
  obraId: ObraId,
  periodoId: PeriodoBmsId,
  dados: {
    readonly numero: number;
    readonly dataInicial: DiaPuro;
    readonly dataFinal: DiaPuro;
  },
): Promise<void> {
  await db
    .update(periodoBms)
    .set(dados)
    .where(and(eq(periodoBms.obraId, obraId), eq(periodoBms.id, periodoId)));
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
export async function excluiPeriodo(
  db: BancoRdo,
  obraId: ObraId,
  periodoId: PeriodoBmsId,
): Promise<void> {
  await db
    .delete(periodoBms)
    .where(and(eq(periodoBms.obraId, obraId), eq(periodoBms.id, periodoId)));
}

export interface LinhaDeServico {
  readonly id: ServicoControladoId;
  readonly nome: string;
  readonly ordem: number;
  readonly ativo: number;
}

export async function listaServicos(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeServico[]> {
  return db
    .select({
      id: servicoControlado.id,
      nome: servicoControlado.nome,
      ordem: servicoControlado.ordem,
      ativo: servicoControlado.ativo,
    })
    .from(servicoControlado)
    .where(eq(servicoControlado.obraId, obraId))
    .orderBy(asc(servicoControlado.ordem));
}

export async function buscaServico(
  db: BancoRdo,
  obraId: ObraId,
  servicoId: ServicoControladoId,
): Promise<LinhaDeServico | null> {
  const linhas = await db
    .select({
      id: servicoControlado.id,
      nome: servicoControlado.nome,
      ordem: servicoControlado.ordem,
      ativo: servicoControlado.ativo,
    })
    .from(servicoControlado)
    .where(and(eq(servicoControlado.obraId, obraId), eq(servicoControlado.id, servicoId)))
    .limit(1);
  return linhas[0] ?? null;
}

export async function insereServico(
  db: BancoRdo,
  dados: {
    readonly id: ServicoControladoId;
    readonly obraId: ObraId;
    readonly nome: string;
    readonly nomeNormalizado: string;
    readonly ordem: number;
  },
): Promise<void> {
  await db.insert(servicoControlado).values({ ...dados, ativo: 1 });
}

export async function insereVersaoDeQuantidade(
  db: BancoRdo,
  dados: {
    readonly id: QuantidadeProjetoVersaoId;
    readonly obraId: ObraId;
    readonly servicoId: ServicoControladoId;
    readonly quantidadeMilesimos: number;
    readonly definidoPor: UsuarioId;
    readonly definidoEm: Instante;
  },
): Promise<void> {
  await db.insert(quantidadeProjetoVersao).values(dados);
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
export async function listaVersoesDoServico(
  db: BancoRdo,
  obraId: ObraId,
  servicoId: ServicoControladoId,
): Promise<LinhaDeVersao[]> {
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
    .orderBy(desc(quantidadeProjetoVersao.definidoEm));
}

/** Todas as versões da obra, para montar a lista de serviços numa consulta só. */
export async function listaVersoesDaObra(
  db: BancoRdo,
  obraId: ObraId,
): Promise<LinhaDeVersao[]> {
  return db
    .select({
      servicoId: quantidadeProjetoVersao.servicoId,
      quantidadeMilesimos: quantidadeProjetoVersao.quantidadeMilesimos,
      definidoPor: quantidadeProjetoVersao.definidoPor,
      definidoEm: quantidadeProjetoVersao.definidoEm,
    })
    .from(quantidadeProjetoVersao)
    .where(eq(quantidadeProjetoVersao.obraId, obraId))
    .orderBy(desc(quantidadeProjetoVersao.definidoEm));
}

export { diaPuroConfiavel };
