/**
 * Serviço controlado e quantidade de projeto — bloco 7 do RDO.
 *
 * Duas regras que a planilha não tem:
 *
 * - **R5:** a produção casa por referência ao cadastro, nunca por igualdade de
 *   texto. Renomear o serviço não pode zerar o acumulado.
 * - **R15:** a quantidade de projeto é **versionada**: quem mudou, quando, de
 *   quanto para quanto. Na planilha as quatro quantidades vêm de um arquivo em
 *   `\\<servidor-interno>` sem aviso de estar desatualizado, e o denominador do
 *   percentual não tem rastro nenhum.
 *
 * A vigente é sempre a **última versão**, e não existe cópia dela no serviço:
 * duas colunas com o mesmo número são duas verdades (arquitetura, decisão 7).
 */

import { instanteAgora } from '../../shared/date/fuso';
import { deMilesimos, paraMilesimos, type Quantidade } from '../../shared/decimal';
import { geraId, type ObraId, type ServicoControladoId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { chaveDeTermo, normalizaTermo } from '../../shared/taxonomia';
import * as repositorio from './repositorio';
import type {
  Ambiente,
  AtorDaObra,
  ServicoControladoComProjeto,
  VersaoDeQuantidade,
} from './tipos';

export interface ComandoServico {
  readonly obraId: ObraId;
  readonly nome: string;
}

export function cadastraServicoControlado(
  cmd: ComandoServico,
  amb: Ambiente,
): Result<ServicoControladoId, ErroDeDominio> {
  const nome = normalizaTermo(cmd.nome);
  if (nome === '') {
    return erro(erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome do serviço.'));
  }

  const existentes = repositorio.listaServicos(amb.db, cmd.obraId);
  const chave = chaveDeTermo(nome);
  const repetido = existentes.find((s) => chaveDeTermo(s.nome) === chave);
  if (repetido !== undefined) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.JA_EXISTE,
        `Já existe o serviço "${repetido.nome}" nesta obra.`,
      ),
    );
  }

  const id = geraId<'servico_controlado'>();
  repositorio.insereServico(amb.db, {
    id,
    obraId: cmd.obraId,
    nome,
    nomeNormalizado: chave,
    ordem: existentes.length + 1,
  });
  return ok(id);
}

export interface ComandoQuantidadeProjeto {
  readonly obraId: ObraId;
  readonly servicoId: ServicoControladoId;
  /**
   * Já validada em `shared/decimal`, que rejeita zero, negativo e mais de três
   * casas (decisão 13.4 e R6). O tipo é a prova de que a borda correu.
   */
  readonly quantidade: Quantidade;
}

export function defineQuantidadeDeProjeto(
  cmd: ComandoQuantidadeProjeto,
  ator: AtorDaObra,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  const servico = repositorio.buscaServico(amb.db, cmd.obraId, cmd.servicoId);
  if (servico === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Serviço não encontrado nesta obra.'),
    );
  }

  // Rede contra dado que tenha escapado da borda: o CHECK do banco também
  // recusa, e o percentual jamais deve dividir por zero (R5, CT-059).
  if (cmd.quantidade.lessThanOrEqualTo(0)) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA,
        'A quantidade de projeto precisa ser maior que zero.',
      ),
    );
  }

  repositorio.insereVersaoDeQuantidade(amb.db, {
    id: geraId<'quantidade_projeto_versao'>(),
    obraId: cmd.obraId,
    servicoId: cmd.servicoId,
    quantidadeMilesimos: paraMilesimos(cmd.quantidade),
    definidoPor: ator.usuarioId,
    definidoEm: instanteAgora(amb.relogio),
  });

  registra('info', geraId<'correlacao'>(), 'obra.quantidade_de_projeto_definida', {
    obraId: cmd.obraId,
    servicoId: cmd.servicoId,
    usuarioId: ator.usuarioId,
  });
  return ok(undefined);
}

/**
 * Os serviços da obra com a quantidade de projeto **vigente**.
 *
 * Vigente = versão mais recente por `definido_em`. Não há vigência temporal: a
 * alteração passa a valer para o percentual de qualquer RDO, inclusive os já
 * exportados (CT-053). É a decisão registrada, não um efeito colateral.
 */
export function listaServicosControlados(
  obraId: ObraId,
  amb: Ambiente,
): Result<ServicoControladoComProjeto[], ErroDeDominio> {
  const versoes = repositorio.listaVersoesDaObra(amb.db, obraId);
  const vigentePorServico = new Map<string, number>();
  for (const versao of versoes) {
    // A consulta já vem da mais recente para a mais antiga: a primeira vence.
    if (!vigentePorServico.has(versao.servicoId)) {
      vigentePorServico.set(versao.servicoId, versao.quantidadeMilesimos);
    }
  }

  return ok(
    repositorio.listaServicos(amb.db, obraId).map((servico) => {
      const milesimos = vigentePorServico.get(servico.id);
      return {
        servicoId: servico.id,
        nome: servico.nome,
        ordem: servico.ordem,
        quantidadeDeProjeto: milesimos === undefined ? null : deMilesimos(milesimos),
      };
    }),
  );
}

/** Histórico completo, do mais recente para o mais antigo (R15, CT-052). */
export function listaHistoricoDeQuantidade(
  obraId: ObraId,
  servicoId: ServicoControladoId,
  amb: Ambiente,
): Result<VersaoDeQuantidade[], ErroDeDominio> {
  return ok(
    repositorio.listaVersoesDoServico(amb.db, obraId, servicoId).map((versao) => ({
      quantidade: deMilesimos(versao.quantidadeMilesimos),
      definidoPor: versao.definidoPor,
      definidoEm: versao.definidoEm,
    })),
  );
}
