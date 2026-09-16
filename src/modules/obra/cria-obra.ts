/**
 * Criação e edição do cadastro da obra — passo 1 do PRD.
 *
 * Os nove campos do cabeçalho (blocos 3 e 4 do gabarito) mais o responsável
 * técnico (bloco 11, decisão 18.1). Contrato é **um campo só** (8.1) e não
 * existe campo de código interno: a planilha tem três identificações da mesma
 * obra em lugares diferentes, e a decisão fecha isso.
 *
 * Três gravações acontecem na **mesma transação**, ou nenhuma:
 *
 * 1. a obra;
 * 2. o acesso de engenheiro do criador (CT-003) — senão a obra nasce
 *    inacessível e ninguém consegue nem cadastrar nem liberar ninguém;
 * 3. ao menos um período de BMS (decisão 21.1) e os quatro serviços
 *    controlados (CT-058), que são o bloco 7 e existem desde o primeiro dia.
 */

import { type DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import { geraId, type ObraId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { chaveDeTermo, SERVICOS_CONTROLADOS_INICIAIS } from '../../shared/taxonomia';
import { gravaPeriodos, validaConjuntoDePeriodos, validaIntervalo } from './periodo-bms';
import * as repositorio from './repositorio';
import type {
  Ambiente,
  AtorDaObra,
  CabecalhoDaObra,
  ComandoCriarObra,
  ComandoEditarObra,
  ResponsavelTecnico,
} from './tipos';

/**
 * R14 na obra: a data de término não é anterior à de início, e datas iguais
 * são aceitas (CT-005). A mensagem é a que o engenheiro lê; o `CHECK` do banco
 * é a rede para a rota que esquecer daqui.
 */
function validaDatasDaObra(
  dataInicio: DiaPuro,
  dataTermino: DiaPuro,
): Result<void, ErroDeDominio> {
  if (dataTermino < dataInicio) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data de término não pode ser anterior à data de início.',
      ),
    );
  }
  return ok(undefined);
}

export function criaObra(
  cmd: ComandoCriarObra,
  ator: AtorDaObra,
  amb: Ambiente,
): Result<ObraId, ErroDeDominio> {
  const datas = validaDatasDaObra(cmd.dataInicio, cmd.dataTermino);
  if (!datas.ok) return datas;

  // Decisão 21.1: obra sem período de BMS nenhum não existe.
  if (cmd.periodosBms.length === 0) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Cadastre ao menos um período de BMS para criar a obra.',
      ),
    );
  }

  const periodos = validaConjuntoDePeriodos(cmd.periodosBms, []);
  if (!periodos.ok) return periodos;

  const obraId = geraId<'obra'>();
  const criadoEm = instanteAgora(amb.relogio);
  const resp = cmd.respTecnico;

  amb.db.transaction((tx) => {
    repositorio.insereObra(tx, {
      id: obraId,
      contrato: cmd.contrato,
      contratante: cmd.contratante,
      contratada: cmd.contratada,
      dataInicio: cmd.dataInicio,
      dataTermino: cmd.dataTermino,
      escopo: cmd.escopo,
      nomeProjeto: cmd.nomeProjeto,
      area: cmd.area,
      local: cmd.local,
      respTecnicoNome: resp?.nome ?? null,
      respTecnicoTitulo: resp?.titulo ?? null,
      respTecnicoCrea: resp?.crea ?? null,
      criadoPor: ator.usuarioId,
      criadoEm,
    });

    amb.concedeAcessoDeEngenheiro(tx, obraId, ator.usuarioId, criadoEm);
    gravaPeriodos(tx, obraId, cmd.periodosBms, ator.usuarioId, criadoEm);
    criaServicosIniciais(tx, obraId);
  });

  // Log por id. Nem contrato nem nome de pessoa entram aqui.
  registra('info', geraId<'correlacao'>(), 'obra.criada', {
    obraId,
    usuarioId: ator.usuarioId,
  });

  return ok(obraId);
}

/**
 * Os quatro serviços controlados, com a grafia exata de `PRODUÇÃO!B2:B5`.
 *
 * Não entram no seed do sistema: serviço tem `obra_id` e pertence à obra
 * (decisão 19.2 vale para taxonomia, não para serviço). As posições são fixas
 * no bloco 7, que sempre mostra as quatro linhas mesmo zeradas.
 */
function criaServicosIniciais(db: Ambiente['db'], obraId: ObraId): void {
  SERVICOS_CONTROLADOS_INICIAIS.forEach((nome, indice) => {
    repositorio.insereServico(db, {
      id: geraId<'servico_controlado'>(),
      obraId,
      nome,
      nomeNormalizado: chaveDeTermo(nome),
      ordem: indice + 1,
    });
  });
}

export function editaCadastroDaObra(
  cmd: ComandoEditarObra,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  if (repositorio.buscaObra(amb.db, cmd.obraId) === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  const datas = validaDatasDaObra(cmd.dataInicio, cmd.dataTermino);
  if (!datas.ok) return datas;

  repositorio.atualizaCabecalho(amb.db, cmd.obraId, {
    contrato: cmd.contrato,
    contratante: cmd.contratante,
    contratada: cmd.contratada,
    dataInicio: cmd.dataInicio,
    dataTermino: cmd.dataTermino,
    escopo: cmd.escopo,
    nomeProjeto: cmd.nomeProjeto,
    area: cmd.area,
    local: cmd.local,
  });
  return ok(undefined);
}

/**
 * Responsável técnico: nome, titulação e CREA moram na **obra** (18.1).
 *
 * Quem assina o RDO é o responsável técnico do contrato, que pode não ser quem
 * opera o sistema (CT-013). São dados pessoais: saem no bloco 11 e em nenhum
 * log, mensagem ou metadado.
 */
export function defineResponsavelTecnico(
  obraId: ObraId,
  resp: ResponsavelTecnico,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  if (repositorio.buscaObra(amb.db, obraId) === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  const nome = resp.nome.trim();
  const titulo = resp.titulo.trim();
  const crea = resp.crea.trim();
  if (nome === '' || titulo === '' || crea === '') {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.TERMO_VAZIO,
        'Informe nome, titulação e registro do responsável técnico.',
      ),
    );
  }

  repositorio.atualizaResponsavelTecnico(amb.db, obraId, nome, titulo, crea);
  registra('info', geraId<'correlacao'>(), 'obra.responsavel_tecnico_definido', {
    obraId,
  });
  return ok(undefined);
}

export function obtemCabecalhoDaObra(
  obraId: ObraId,
  amb: Ambiente,
): Result<CabecalhoDaObra, ErroDeDominio> {
  const linha = repositorio.buscaObra(amb.db, obraId);
  if (linha === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  const nome = linha.respTecnicoNome;
  const titulo = linha.respTecnicoTitulo;
  const crea = linha.respTecnicoCrea;

  return ok({
    obraId: linha.id,
    contrato: linha.contrato,
    contratante: linha.contratante,
    contratada: linha.contratada,
    dataInicio: linha.dataInicio,
    dataTermino: linha.dataTermino,
    escopo: linha.escopo,
    nomeProjeto: linha.nomeProjeto,
    area: linha.area,
    local: linha.local,
    respTecnico:
      nome === null || titulo === null || crea === null ? null : { nome, titulo, crea },
  });
}

export { validaIntervalo };
