/** Borda do módulo `equipamento`. Zod na forma, `shared` nos tipos de domínio. */

import { z } from 'zod';

import { criaDiaPuro, type DiaPuro } from '../../../shared/date/dia';
import { idConfiavel } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  ok,
  type ErroDeEntrada,
  type Result,
} from '../../../shared/result';
import type { ComandoCadastrarEquipamento, ComandoPassagemDeEquipamento } from '../tipos';

const MAXIMO_DE_IDENTIFICADOR = 40;

function exigeDia(bruto: unknown, campo: string): Result<DiaPuro, ErroDeEntrada> {
  if (typeof bruto !== 'string' || bruto.trim() === '') {
    return erro(erroDeEntrada(CODIGO_ERRO.DIA_INVALIDO, 'Informe a data.', campo));
  }
  const dia = criaDiaPuro(bruto.trim());
  if (!dia.ok) return erro(erroDeEntrada(dia.erro.codigo, dia.erro.mensagem, campo));
  return ok(dia.valor);
}

function diaOpcional(
  bruto: unknown,
  campo: string,
): Result<DiaPuro | null, ErroDeEntrada> {
  if (bruto === undefined || bruto === null) return ok(null);
  if (typeof bruto === 'string' && bruto.trim() === '') return ok(null);
  return exigeDia(bruto, campo);
}

const formaDeCadastro = z.object({
  obraId: z.string(),
  identificador: z.unknown(),
  tipo: z.unknown(),
  entrada: z.unknown(),
  saida: z.unknown().optional(),
});

export function analisaCadastrarEquipamento(
  bruto: unknown,
): Result<ComandoCadastrarEquipamento, ErroDeEntrada> {
  const forma = formaDeCadastro.safeParse(bruto);
  if (!forma.success) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        'O formulário chegou incompleto. Recarregue a página e tente de novo.',
      ),
    );
  }
  const dados = forma.data;

  if (typeof dados.identificador !== 'string' || dados.identificador.trim() === '') {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        'Informe o identificador do equipamento.',
        'identificador',
      ),
    );
  }
  if (dados.identificador.trim().length > MAXIMO_DE_IDENTIFICADOR) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        'O identificador é longo demais.',
        'identificador',
      ),
    );
  }
  if (typeof dados.tipo !== 'string' || dados.tipo.trim() === '') {
    return erro(
      erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'Escolha o tipo na lista.', 'tipo'),
    );
  }

  const entrada = exigeDia(dados.entrada, 'entrada');
  if (!entrada.ok) return entrada;
  const saida = diaOpcional(dados.saida, 'saida');
  if (!saida.ok) return saida;

  return ok({
    obraId: idConfiavel<'obra'>(dados.obraId),
    identificador: dados.identificador,
    tipoTermo: dados.tipo,
    entrada: entrada.valor,
    saida: saida.valor,
  });
}

const formaDePassagem = z.object({
  obraId: z.string(),
  equipamentoId: z.string(),
  entrada: z.unknown(),
  saida: z.unknown().optional(),
});

export function analisaPassagemDeEquipamento(
  bruto: unknown,
): Result<ComandoPassagemDeEquipamento, ErroDeEntrada> {
  const forma = formaDePassagem.safeParse(bruto);
  if (!forma.success) {
    return erro(
      erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'O formulário chegou incompleto.'),
    );
  }

  const entrada = exigeDia(forma.data.entrada, 'entrada');
  if (!entrada.ok) return entrada;
  const saida = diaOpcional(forma.data.saida, 'saida');
  if (!saida.ok) return saida;

  return ok({
    obraId: idConfiavel<'obra'>(forma.data.obraId),
    equipamentoId: idConfiavel<'equipamento'>(forma.data.equipamentoId),
    entrada: entrada.valor,
    saida: saida.valor,
  });
}
