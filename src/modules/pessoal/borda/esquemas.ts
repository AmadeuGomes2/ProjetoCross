/**
 * Borda do módulo `pessoal`. Zod na forma, `shared` nos tipos de domínio.
 *
 * `saida` aceita ausência e string vazia como **"ainda na obra"**: o
 * formulário manda campo vazio, e transformar isso em data comparável daria
 * falso em `saída ≥ D` e esvaziaria o efetivo inteiro (CT-040).
 */

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
import type { ComandoCadastrarPessoa, ComandoPassagem } from '../tipos';

const MAXIMO_DE_NOME = 120;

function exigeDia(bruto: unknown, campo: string): Result<DiaPuro, ErroDeEntrada> {
  if (typeof bruto !== 'string' || bruto.trim() === '') {
    // Caso de teste obrigatório 14: registro sem data não existe. A linha 509
    // da planilha é órfã e ninguém a rejeitou.
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

const formaDeCadastrarPessoa = z.object({
  obraId: z.string(),
  nome: z.unknown(),
  funcao: z.unknown(),
  entrada: z.unknown(),
  saida: z.unknown().optional(),
});

export function analisaCadastrarPessoa(
  bruto: unknown,
): Result<ComandoCadastrarPessoa, ErroDeEntrada> {
  const forma = formaDeCadastrarPessoa.safeParse(bruto);
  if (!forma.success) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.TERMO_VAZIO,
        'O formulário chegou incompleto. Recarregue a página e tente de novo.',
      ),
    );
  }
  const dados = forma.data;

  if (typeof dados.nome !== 'string' || dados.nome.trim() === '') {
    return erro(
      erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome da pessoa.', 'nome'),
    );
  }
  if (dados.nome.trim().length > MAXIMO_DE_NOME) {
    return erro(erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'O nome é longo demais.', 'nome'));
  }

  // Sem função a pessoa não tem coluna no bloco 5 e some do RDO em silêncio
  // (CT-036). O termo é resolvido contra o cadastro no caso de uso.
  if (typeof dados.funcao !== 'string' || dados.funcao.trim() === '') {
    return erro(
      erroDeEntrada(CODIGO_ERRO.TERMO_VAZIO, 'Escolha a função na lista.', 'funcao'),
    );
  }

  const entrada = exigeDia(dados.entrada, 'entrada');
  if (!entrada.ok) return entrada;

  const saida = diaOpcional(dados.saida, 'saida');
  if (!saida.ok) return saida;

  return ok({
    obraId: idConfiavel<'obra'>(dados.obraId),
    nome: dados.nome.trim(),
    funcaoTermo: dados.funcao,
    entrada: entrada.valor,
    saida: saida.valor,
  });
}

const formaDePassagem = z.object({
  obraId: z.string(),
  pessoaId: z.string(),
  entrada: z.unknown(),
  saida: z.unknown().optional(),
});

export function analisaPassagem(bruto: unknown): Result<ComandoPassagem, ErroDeEntrada> {
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
    pessoaId: idConfiavel<'pessoa'>(forma.data.pessoaId),
    entrada: entrada.valor,
    saida: saida.valor,
  });
}
