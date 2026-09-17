/**
 * Equipamento: cadastro de equipamento e de passagens pela obra.
 *
 * **Uma regra, duas tabelas, uma função.** A decisão 1.2, de 16/09/2026, acabou
 * com a divergência da planilha, que tinha três comportamentos diferentes para
 * o dia da saída. O equipamento segue exatamente a regra da pessoa, e a regra
 * mora em `intervaloCobreODia`, em `shared/date/intervalo` — aplicada pelo
 * `rdo`, que é quem conta. Este módulo entrega a mobilização crua.
 *
 * `EQUIPAMENTO!M2` da planilha é uma nota solta registrando um equipamento
 * fora da tabela, justamente porque o modelo de intervalo único não comporta
 * ida e volta. Aqui a passagem é entidade própria (caso de teste obrigatório 8).
 *
 * ## Assíncrono desde 17/09/2026
 *
 * O banco é Postgres e o driver é assíncrono: o que toca o banco devolve
 * `Promise<Result<...>>`, a validação pura continua síncrona.
 *
 * `cadastraEquipamento` grava equipamento e primeira passagem, e as duas vão na
 * **mesma transação**. Com o driver síncrono não havia como parar entre elas;
 * agora há, e equipamento sem passagem nenhuma é uma coluna do bloco 6 que
 * nunca aparece em RDO nenhum, sem ninguém descobrir por quê.
 */

import type { DiaPuro } from '../../shared/date/dia';
import { instanteAgora } from '../../shared/date/fuso';
import {
  conflitaComAlgum,
  ordemDasDatasEstaInvertida,
} from '../../shared/date/intervalo';
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
  EquipamentoComPassagens,
  EquipamentoMobilizado,
  PassagemMobilizada,
} from './tipos';

/**
 * R14, igual a `pessoal`. Datas iguais são aceitas (CT-046).
 *
 * A comparação mora em `shared/date/intervalo`, que é a mesma que `pessoal`
 * usa. O que é deste módulo é só a mensagem: a cópia local da regra — que o
 * próprio comentário admitia ser cópia — foi apagada.
 */
function validaOrdemDasDatas(
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  if (ordemDasDatasEstaInvertida({ inicio: entrada, fim: saida })) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data de saída não pode ser anterior à data de entrada.',
      ),
    );
  }
  return ok(undefined);
}

/**
 * Duas passagens do mesmo equipamento não se sobrepõem.
 *
 * `INTERVALO_SOBREPOSTO`, e não `DATA_FINAL_ANTES_DA_INICIAL`: ali é um
 * intervalo só, invertido; aqui são dois intervalos brigando.
 */
function validaSobreposicaoDePassagens(
  existentes: readonly { entrada: DiaPuro; saida: DiaPuro | null }[],
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  const conflita = conflitaComAlgum(
    { inicio: entrada, fim: saida },
    existentes.map((p) => ({ inicio: p.entrada, fim: p.saida })),
  );
  if (conflita) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.INTERVALO_SOBREPOSTO,
        'Já existe uma passagem deste equipamento cobrindo esse intervalo. Encerre a anterior antes.',
      ),
    );
  }
  return ok(undefined);
}

export async function cadastraEquipamento(
  cmd: ComandoCadastrarEquipamento,
  ator: AtorDeEquipamento,
  amb: Ambiente,
): Promise<Result<EquipamentoId, ErroDeDominio>> {
  // Normaliza só as pontas (decisão 17.1). `CARRO LOC.` tem ponto e espaço no
  // meio e continua exatamente assim: é o valor real de `EQUIPAMENTO!B7`.
  const identificador = normalizaTermo(cmd.identificador);
  if (identificador === '') {
    return erro(
      erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o identificador do equipamento.'),
    );
  }

  const tipo = await amb.resolveTipoEquipamento(cmd.tipoTermo);
  if (tipo === null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Escolha um tipo de equipamento da lista. Para usar um tipo novo, cadastre-o antes.',
      ),
    );
  }

  if (
    (await repositorio.buscaPorIdentificador(amb.db, cmd.obraId, identificador)) !== null
  ) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.JA_EXISTE,
        'Este identificador já existe nesta obra. Use outro.',
      ),
    );
  }

  const intervalo = validaOrdemDasDatas(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const equipamentoId = geraId<'equipamento'>();
  const em = instanteAgora(amb.relogio);

  // Equipamento e primeira passagem são uma coisa só: meia gravação deixa uma
  // coluna do bloco 6 que nunca aparece em RDO nenhum.
  await amb.db.transaction(async (tx) => {
    await repositorio.insereEquipamento(tx, {
      id: equipamentoId,
      obraId: cmd.obraId,
      identificador,
      tipoEquipamentoId: tipo.id,
      criadoPor: ator.usuarioId,
      criadoEm: em,
    });
    await repositorio.inserePassagem(tx, {
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

export async function registraPassagem(
  cmd: ComandoPassagemDeEquipamento,
  ator: AtorDeEquipamento,
  amb: Ambiente,
): Promise<Result<PassagemEquipamentoId, ErroDeDominio>> {
  if (
    (await repositorio.buscaEquipamento(amb.db, cmd.obraId, cmd.equipamentoId)) === null
  ) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Equipamento não encontrado nesta obra.'),
    );
  }

  const intervalo = validaOrdemDasDatas(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const existentes = await repositorio.listaPassagensDoEquipamento(
    amb.db,
    cmd.obraId,
    cmd.equipamentoId,
  );
  const sobreposicao = validaSobreposicaoDePassagens(existentes, cmd.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  const id = geraId<'passagem_equipamento'>();
  await repositorio.inserePassagem(amb.db, {
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

export async function encerraPassagem(
  cmd: ComandoEncerrarPassagemDeEquipamento,
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  const passagem = await repositorio.buscaPassagem(amb.db, cmd.obraId, cmd.passagemId);
  if (passagem === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Passagem não encontrada.'));
  }

  const intervalo = validaOrdemDasDatas(passagem.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const outras = (
    await repositorio.listaPassagensDoEquipamento(
      amb.db,
      cmd.obraId,
      passagem.equipamentoId,
    )
  ).filter((p) => p.id !== cmd.passagemId);
  const sobreposicao = validaSobreposicaoDePassagens(outras, passagem.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  await repositorio.atualizaSaida(amb.db, cmd.obraId, cmd.passagemId, cmd.saida);
  return ok(undefined);
}

export async function listaEquipamentosDaObra(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<EquipamentoComPassagens[], ErroDeDominio>> {
  // Duas leituras independentes, sem uma esperar a outra: em série seriam dois
  // tempos de resposta do banco empilhados à toa.
  const [passagens, equipamentos] = await Promise.all([
    repositorio.listaTodasAsPassagens(amb.db, obraId),
    repositorio.listaEquipamentosComTipo(amb.db, obraId),
  ]);
  return ok(
    equipamentos.map((e) => ({
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
 * A mobilização de equipamento da obra: as passagens cruas, por identificador.
 *
 * Devolve **todos** os equipamentos cadastrados, inclusive os que não têm
 * passagem vigente no dia consultado: o bloco 6 do gabarito mostra a coluna com
 * a célula em branco, e uma coluna que some leva o `TOTAL` junto.
 *
 * Quem conta é `src/modules/rdo/efetivo.ts`, e só ele. Havia uma segunda
 * agregação aqui, com formato diferente do bloco 6; foi removida na integração
 * das frentes. Ver `docs/arquitetura/v1.md`, decisão 20 da seção 7.
 *
 * `ordem` é a posição da coluna no bloco, e sai do próprio cadastro, que o
 * repositório entrega ordenado por identificador. Ela existe para que duas
 * consultas do mesmo dia produzam o mesmo documento (CT-241) — o tipo não pode
 * depender de quem chamou lembrar de ordenar.
 *
 * O tipo do equipamento **não sai daqui**: o bloco 6 imprime `CF-29`, nunca
 * `PATROL` (CT-049).
 */
export async function listaMobilizacao(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<EquipamentoMobilizado[], ErroDeDominio>> {
  // **Duas consultas, em paralelo, e nenhuma dentro de laço.** Este é o caminho
  // quente do RDO: uma ida ao banco por equipamento multiplicaria a latência
  // pelo tamanho da frota.
  const [linhasDePassagem, equipamentos] = await Promise.all([
    repositorio.listaPassagensDaObra(amb.db, obraId),
    repositorio.listaEquipamentosComTipo(amb.db, obraId),
  ]);

  const passagensPorEquipamento = new Map<EquipamentoId, PassagemMobilizada[]>();
  for (const linha of linhasDePassagem) {
    const atual = passagensPorEquipamento.get(linha.equipamentoId) ?? [];
    atual.push({ entrada: linha.entrada, saida: linha.saida });
    passagensPorEquipamento.set(linha.equipamentoId, atual);
  }

  return ok(
    equipamentos.map((e, indice) => ({
      equipamentoId: e.id,
      identificador: e.identificador,
      ordem: indice + 1,
      passagens: passagensPorEquipamento.get(e.id) ?? [],
    })),
  );
}
