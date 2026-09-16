/**
 * Equipamento: cadastro, passagens e efetivo por identificador.
 *
 * **Uma regra, duas tabelas, uma função.** A decisão 1.2, de 16/09/2026, acabou
 * com a divergência da planilha, que tinha três comportamentos diferentes para
 * o dia da saída. O equipamento segue exatamente a regra da pessoa, e a regra
 * mora em `intervaloCobreODia`, em `shared/date/intervalo`.
 *
 * `EQUIPAMENTO!M2` da planilha é uma nota solta registrando um equipamento
 * fora da tabela, justamente porque o modelo de intervalo único não comporta
 * ida e volta. Aqui a passagem é entidade própria (caso de teste obrigatório 8).
 */

import type { DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import { intervaloCobreODia } from '../../shared/date/intervalo';
import {
  geraId,
  type EquipamentoId,
  type ObraId,
  type PassagemEquipamentoId,
} from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { normalizaTermo } from '../../shared/taxonomia';
import * as repositorio from './repositorio';
import type {
  Ambiente,
  AtorDeEquipamento,
  ComandoCadastrarEquipamento,
  ComandoEncerrarPassagemDeEquipamento,
  ComandoPassagemDeEquipamento,
  EfetivoPorIdentificador,
  EquipamentoComPassagens,
} from './tipos';

/** R14, igual a `pessoal`. Datas iguais são aceitas (CT-046). */
function validaIntervaloDaPassagem(
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  if (saida !== null && saida < entrada) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data de saída não pode ser anterior à data de entrada.',
      ),
    );
  }
  return ok(undefined);
}

function validaSobreposicao(
  existentes: readonly { entrada: DiaPuro; saida: DiaPuro | null }[],
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  for (const p of existentes) {
    const conflita =
      (p.saida === null || entrada <= p.saida) && (saida === null || saida >= p.entrada);
    if (conflita) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
          'Já existe uma passagem deste equipamento cobrindo esse intervalo. Encerre a anterior antes.',
        ),
      );
    }
  }
  return ok(undefined);
}

export function cadastraEquipamento(
  cmd: ComandoCadastrarEquipamento,
  ator: AtorDeEquipamento,
  amb: Ambiente,
): Result<EquipamentoId, ErroDeDominio> {
  // Normaliza só as pontas (decisão 17.1). `CARRO LOC.` tem ponto e espaço no
  // meio e continua exatamente assim: é o valor real de `EQUIPAMENTO!B7`.
  const identificador = normalizaTermo(cmd.identificador);
  if (identificador === '') {
    return erro(
      erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o identificador do equipamento.'),
    );
  }

  const tipo = amb.resolveTipoEquipamento(cmd.tipoTermo);
  if (tipo === null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Escolha um tipo de equipamento da lista. Para usar um tipo novo, cadastre-o antes.',
      ),
    );
  }

  if (repositorio.buscaPorIdentificador(amb.db, cmd.obraId, identificador) !== null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.JA_EXISTE,
        'Este identificador já existe nesta obra. Use outro.',
      ),
    );
  }

  const intervalo = validaIntervaloDaPassagem(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const equipamentoId = geraId<'equipamento'>();
  const em = instanteAgora(amb.relogio);

  amb.db.transaction((tx) => {
    repositorio.insereEquipamento(tx, {
      id: equipamentoId,
      obraId: cmd.obraId,
      identificador,
      tipoEquipamentoId: tipo.id,
      criadoPor: ator.usuarioId,
      criadoEm: em,
    });
    repositorio.inserePassagem(tx, {
      id: geraId<'passagem_equipamento'>(),
      obraId: cmd.obraId,
      equipamentoId,
      entrada: cmd.entrada,
      saida: cmd.saida,
      registradoPor: ator.usuarioId,
      registradoEm: em,
    });
  });

  registra('info', geraId<'correlacao'>(), 'equipamento.cadastrado', {
    obraId: cmd.obraId,
    equipamentoId,
  });
  return ok(equipamentoId);
}

export function registraPassagem(
  cmd: ComandoPassagemDeEquipamento,
  ator: AtorDeEquipamento,
  amb: Ambiente,
): Result<PassagemEquipamentoId, ErroDeDominio> {
  if (repositorio.buscaEquipamento(amb.db, cmd.obraId, cmd.equipamentoId) === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Equipamento não encontrado nesta obra.'),
    );
  }

  const intervalo = validaIntervaloDaPassagem(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const existentes = repositorio.listaPassagensDoEquipamento(
    amb.db,
    cmd.obraId,
    cmd.equipamentoId,
  );
  const sobreposicao = validaSobreposicao(existentes, cmd.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  const id = geraId<'passagem_equipamento'>();
  repositorio.inserePassagem(amb.db, {
    id,
    obraId: cmd.obraId,
    equipamentoId: cmd.equipamentoId,
    entrada: cmd.entrada,
    saida: cmd.saida,
    registradoPor: ator.usuarioId,
    registradoEm: instanteAgora(amb.relogio),
  });
  return ok(id);
}

export function encerraPassagem(
  cmd: ComandoEncerrarPassagemDeEquipamento,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  const passagem = repositorio.buscaPassagem(amb.db, cmd.obraId, cmd.passagemId);
  if (passagem === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Passagem não encontrada.'));
  }

  const intervalo = validaIntervaloDaPassagem(passagem.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const outras = repositorio
    .listaPassagensDoEquipamento(amb.db, cmd.obraId, passagem.equipamentoId)
    .filter((p) => p.id !== cmd.passagemId);
  const sobreposicao = validaSobreposicao(outras, passagem.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  repositorio.atualizaSaida(amb.db, cmd.obraId, cmd.passagemId, cmd.saida);
  return ok(undefined);
}

export function listaEquipamentosDaObra(
  obraId: ObraId,
  amb: Ambiente,
): Result<EquipamentoComPassagens[], ErroDeDominio> {
  const passagens = repositorio.listaTodasAsPassagens(amb.db, obraId);
  return ok(
    repositorio.listaEquipamentosComTipo(amb.db, obraId).map((e) => ({
      equipamentoId: e.id,
      identificador: e.identificador,
      tipoId: e.tipoId,
      tipoTermo: e.tipoTermo,
      passagens: passagens
        .filter((p) => p.equipamentoId === e.id)
        .map((p) => ({ id: p.id, entrada: p.entrada, saida: p.saida })),
    })),
  );
}

/**
 * Efetivo do dia, por identificador — bloco 6 do RDO.
 *
 * Um equipamento presente conta **um**, mesmo com duas passagens cadastradas
 * (R3). O tipo não sai daqui: o bloco 6 imprime `CF-29`, nunca `PATROL`
 * (CT-049).
 *
 * Como em `pessoal`, **não zera em dia parado**: quem zera é o `rdo` (5.1).
 */
export function contaEfetivoPorIdentificador(
  obraId: ObraId,
  dia: DiaPuro,
  amb: Ambiente,
): Result<EfetivoPorIdentificador[], ErroDeDominio> {
  const presentes = new Map<EquipamentoId, string>();

  for (const linha of repositorio.listaPassagensDaObra(amb.db, obraId)) {
    if (!intervaloCobreODia(linha.entrada, linha.saida, dia)) continue;
    presentes.set(linha.equipamentoId, linha.identificador);
  }

  return ok(
    [...presentes.entries()]
      .map(([equipamentoId, identificador]) => ({
        equipamentoId,
        identificador,
        quantidade: 1,
      }))
      .sort((a, b) => a.identificador.localeCompare(b.identificador, 'pt-BR')),
  );
}
