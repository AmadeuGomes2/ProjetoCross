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

/**
 * Cadastra um serviço avulso, **conferência e gravação na mesma transação**.
 *
 * Duas coisas dependem do que a leitura viu: a recusa do nome repetido e a
 * `ordem`, que é `existentes.length + 1` e é a posição do serviço no bloco 7.
 * Sem transação, dois cadastros simultâneos sairiam com a mesma ordem e o bloco
 * teria duas linhas disputando a mesma posição.
 */
export async function cadastraServicoControlado(
  cmd: ComandoServico,
  amb: Ambiente,
): Promise<Result<ServicoControladoId, ErroDeDominio>> {
  const nome = normalizaTermo(cmd.nome);
  if (nome === '') {
    return erro(erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome do serviço.'));
  }

  return amb.db.transaction<Result<ServicoControladoId, ErroDeDominio>>(async (tx) => {
    const existentes = await repositorio.listaServicos(tx, cmd.obraId);
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
    await repositorio.insereServico(tx, {
      id,
      obraId: cmd.obraId,
      nome,
      nomeNormalizado: chave,
      ordem: existentes.length + 1,
    });
    return ok(id);
  });
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

export async function defineQuantidadeDeProjeto(
  cmd: ComandoQuantidadeProjeto,
  ator: AtorDaObra,
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  const servico = await repositorio.buscaServico(amb.db, cmd.obraId, cmd.servicoId);
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

  await repositorio.insereVersaoDeQuantidade(amb.db, {
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
export async function listaServicosControlados(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<ServicoControladoComProjeto[], ErroDeDominio>> {
  // Duas consultas, e só duas: as versões de toda a obra de uma vez, não uma
  // por serviço. `Promise.all` porque uma não depende da outra, e o bloco 7 é
  // desenhado a cada abertura do RDO.
  const [versoes, servicos] = await Promise.all([
    repositorio.listaVersoesDaObra(amb.db, obraId),
    repositorio.listaServicos(amb.db, obraId),
  ]);

  const vigentePorServico = new Map<string, number>();
  for (const versao of versoes) {
    // A consulta já vem da mais recente para a mais antiga: a primeira vence.
    if (!vigentePorServico.has(versao.servicoId)) {
      vigentePorServico.set(versao.servicoId, versao.quantidadeMilesimos);
    }
  }

  return ok(
    servicos.map((servico) => {
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
export async function listaHistoricoDeQuantidade(
  obraId: ObraId,
  servicoId: ServicoControladoId,
  amb: Ambiente,
): Promise<Result<VersaoDeQuantidade[], ErroDeDominio>> {
  const versoes = await repositorio.listaVersoesDoServico(amb.db, obraId, servicoId);
  return ok(
    versoes.map((versao) => ({
      quantidade: deMilesimos(versao.quantidadeMilesimos),
      definidoPor: versao.definidoPor,
      definidoEm: versao.definidoEm,
    })),
  );
}
