/**
 * A borda do módulo `lancamento`: onde o Zod acontece.
 *
 * Arquitetura 5.1: **toda** entrada vinda de fora é hostil, a validação por
 * esquema acontece num lugar só, e usa-se `safeParse`, nunca `parse` — falha de
 * entrada é `Result`, não exceção.
 *
 * O esquema não devolve `string`: ele transforma para `DiaPuro`, `Quantidade`,
 * `ObraId` e as uniões literais de `shared`. A saída daqui é um comando de
 * `comandos.ts`, e é a única forma de chamar um caso de uso.
 *
 * Mensagem de erro é para quem vai agir, em português, e nunca carrega nome de
 * pessoa nem o valor digitado.
 */

import { z } from 'zod';

import { criaDiaPuro } from '../../../shared/date/dia';
import { deTextoDoUsuario } from '../../../shared/decimal';
import { idConfiavel } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  ok,
  type CodigoErro,
  type ErroDeEntrada,
  type Result,
} from '../../../shared/result';
import type {
  ComandoAtividade,
  ComandoConfirmarDia,
  ComandoCorrigir,
  ComandoEstadoDoDia,
  ComandoExcluir,
  ComandoFecharDia,
  ComandoObservacao,
  ComandoPluviometria,
  ComandoProducao,
  ConteudoDeLancamento,
  ReferenciaDeServico,
  ReferenciaDeStatus,
} from '../comandos';
import {
  exigeMotivoDeParada,
  exigeTextoNaoVazio,
  indicePluviometricoDeTexto,
  letraDeTurnoDeTexto,
} from '../regras';

/** Limites de tamanho de texto livre (R23). Generosos, mas existentes. */
export const LIMITE_DESCRICAO = 500;
export const LIMITE_MOTIVO = 500;
export const LIMITE_OBSERVACAO = 2000;
const LIMITE_ID = 64;

const identificador = z.string().min(1).max(LIMITE_ID);
const textoOpcional = z.string().max(LIMITE_OBSERVACAO).nullish();

const referenciaDeStatus = z.union([
  z.object({ tipo: z.literal('id'), id: identificador }),
  z.object({ tipo: z.literal('termo'), termo: z.string().min(1).max(LIMITE_DESCRICAO) }),
]);

const referenciaDeServico = z.union([
  z.object({ tipo: z.literal('id'), id: identificador }),
  z.object({ tipo: z.literal('nome'), nome: z.string().min(1).max(LIMITE_DESCRICAO) }),
]);

/**
 * Mensagem por campo.
 *
 * O Zod fala inglês e fala de tipo; quem preenche o formulário no canteiro
 * precisa saber o que corrigir. A tradução mora aqui, uma vez.
 */
const POR_CAMPO: Readonly<Record<string, { codigo: CodigoErro; mensagem: string }>> = {
  obraId: {
    codigo: CODIGO_ERRO.NAO_ENCONTRADO,
    mensagem: 'Obra não informada.',
  },
  data: {
    codigo: CODIGO_ERRO.DIA_INVALIDO,
    mensagem: 'Informe a data a que o lançamento se refere.',
  },
  estado: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Diga se o dia foi trabalhado ou parado.',
  },
  motivoParada: {
    codigo: CODIGO_ERRO.MOTIVO_OBRIGATORIO,
    mensagem: 'Informe o motivo da parada.',
  },
  descricao: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Descreva a atividade.',
  },
  status: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Escolha o status da atividade.',
  },
  servico: {
    codigo: CODIGO_ERRO.NAO_ENCONTRADO,
    mensagem: 'Escolha o serviço controlado.',
  },
  quantidade: {
    codigo: CODIGO_ERRO.QUANTIDADE_INVALIDA,
    mensagem: 'Informe a quantidade produzida.',
  },
  indiceMm: {
    codigo: CODIGO_ERRO.QUANTIDADE_INVALIDA,
    mensagem: 'Informe o índice pluviométrico em mm.',
  },
  texto: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Escreva a observação.',
  },
  lado: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Lado da observação inválido.',
  },
  lancamentoId: {
    codigo: CODIGO_ERRO.NAO_ENCONTRADO,
    mensagem: 'Lançamento não informado.',
  },
  tipo: {
    codigo: CODIGO_ERRO.TERMO_VAZIO,
    mensagem: 'Tipo de lançamento inválido.',
  },
};

function primeiroErro(resultado: z.ZodError): ErroDeEntrada {
  const problema = resultado.issues[0];
  const campo = String(problema?.path?.[0] ?? '');
  const conhecido = POR_CAMPO[campo];
  if (conhecido === undefined) {
    return erroDeEntrada(
      CODIGO_ERRO.TERMO_VAZIO,
      'Há um campo faltando ou preenchido de forma inválida.',
    );
  }
  return erroDeEntrada(conhecido.codigo, conhecido.mensagem, campo);
}

const esquemaEstado = z.object({
  obraId: identificador,
  data: z.string(),
  estado: z.enum(['trabalhado', 'parado']),
  motivoParada: textoOpcional,
});

function montaEstadoDoDia(
  dados: z.infer<typeof esquemaEstado>,
): Result<ComandoEstadoDoDia, ErroDeEntrada> {
  const data = criaDiaPuro(dados.data);
  if (!data.ok) return data;
  const obraId = idConfiavel<'obra'>(dados.obraId);
  if (dados.estado === 'trabalhado') {
    return ok({ obraId, data: data.valor, estado: 'trabalhado' });
  }
  const motivo = exigeMotivoDeParada(dados.motivoParada ?? '');
  if (!motivo.ok) return motivo;
  return ok({ obraId, data: data.valor, estado: 'parado', motivoParada: motivo.valor });
}

export function leComandoDeEstadoDoDia(
  bruto: unknown,
): Result<ComandoEstadoDoDia, ErroDeEntrada> {
  const lido = esquemaEstado.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  return montaEstadoDoDia(lido.data);
}

const esquemaConfirmacao = esquemaEstado.extend({
  noiteAnterior: z.string().max(4).nullish(),
  manha: z.string().max(4).nullish(),
  tarde: z.string().max(4).nullish(),
  indiceMm: z.string().max(20).nullish(),
});

export function leComandoDeConfirmacao(
  bruto: unknown,
): Result<ComandoConfirmarDia, ErroDeEntrada> {
  const lido = esquemaConfirmacao.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const estado = montaEstadoDoDia(lido.data);
  if (!estado.ok) return estado;

  const noiteAnterior = letraDeTurnoDeTexto(lido.data.noiteAnterior, 'noiteAnterior');
  if (!noiteAnterior.ok) return noiteAnterior;
  const manha = letraDeTurnoDeTexto(lido.data.manha, 'manha');
  if (!manha.ok) return manha;
  const tarde = letraDeTurnoDeTexto(lido.data.tarde, 'tarde');
  if (!tarde.ok) return tarde;

  const bruteIndice = lido.data.indiceMm ?? '';
  let indiceMm: ComandoConfirmarDia['indiceMm'] = null;
  if (bruteIndice.trim() !== '') {
    const lidoIndice = indicePluviometricoDeTexto(bruteIndice);
    if (!lidoIndice.ok) return lidoIndice;
    indiceMm = lidoIndice.valor;
  }

  const temTurno =
    noiteAnterior.valor !== null || manha.valor !== null || tarde.valor !== null;
  const turnos =
    temTurno || indiceMm !== null
      ? {
          noiteAnterior: noiteAnterior.valor,
          manha: manha.valor,
          tarde: tarde.valor,
        }
      : null;

  return ok({ ...estado.valor, turnos, indiceMm });
}

const esquemaAtividade = z.object({
  obraId: identificador,
  data: z.string(),
  descricao: z.string().max(LIMITE_DESCRICAO),
  status: referenciaDeStatus,
  chaveDeRascunho: z.string().min(1).max(LIMITE_ID).nullish(),
});

function converteStatus(bruto: z.infer<typeof referenciaDeStatus>): ReferenciaDeStatus {
  return bruto.tipo === 'id'
    ? { tipo: 'id', id: idConfiavel<'status_atividade'>(bruto.id) }
    : { tipo: 'termo', termo: bruto.termo };
}

function converteServico(
  bruto: z.infer<typeof referenciaDeServico>,
): ReferenciaDeServico {
  return bruto.tipo === 'id'
    ? { tipo: 'id', id: idConfiavel<'servico_controlado'>(bruto.id) }
    : { tipo: 'nome', nome: bruto.nome };
}

export function leComandoDeAtividade(
  bruto: unknown,
): Result<ComandoAtividade, ErroDeEntrada> {
  const lido = esquemaAtividade.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const data = criaDiaPuro(lido.data.data);
  if (!data.ok) return data;
  const descricao = exigeTextoNaoVazio(
    lido.data.descricao,
    'Descreva a atividade.',
    'descricao',
  );
  if (!descricao.ok) return descricao;
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    data: data.valor,
    descricao: descricao.valor,
    status: converteStatus(lido.data.status),
    chaveDeRascunho: lido.data.chaveDeRascunho ?? null,
  });
}

const esquemaProducao = z.object({
  obraId: identificador,
  data: z.string(),
  servico: referenciaDeServico,
  quantidade: z.string().max(20),
  chaveDeRascunho: z.string().min(1).max(LIMITE_ID).nullish(),
});

export function leComandoDeProducao(
  bruto: unknown,
): Result<ComandoProducao, ErroDeEntrada> {
  const lido = esquemaProducao.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const data = criaDiaPuro(lido.data.data);
  if (!data.ok) return data;
  const quantidade = deTextoDoUsuario(lido.data.quantidade);
  if (!quantidade.ok) return quantidade;
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    data: data.valor,
    servico: converteServico(lido.data.servico),
    quantidade: quantidade.valor,
    chaveDeRascunho: lido.data.chaveDeRascunho ?? null,
  });
}

const esquemaPluviometria = z.object({
  obraId: identificador,
  data: z.string(),
  noiteAnterior: z.string().max(4).nullish(),
  manha: z.string().max(4).nullish(),
  tarde: z.string().max(4).nullish(),
  indiceMm: z.string().max(20),
  chaveDeRascunho: z.string().min(1).max(LIMITE_ID).nullish(),
});

export function leComandoDePluviometria(
  bruto: unknown,
): Result<ComandoPluviometria, ErroDeEntrada> {
  const lido = esquemaPluviometria.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const data = criaDiaPuro(lido.data.data);
  if (!data.ok) return data;
  const noiteAnterior = letraDeTurnoDeTexto(lido.data.noiteAnterior, 'noiteAnterior');
  if (!noiteAnterior.ok) return noiteAnterior;
  const manha = letraDeTurnoDeTexto(lido.data.manha, 'manha');
  if (!manha.ok) return manha;
  const tarde = letraDeTurnoDeTexto(lido.data.tarde, 'tarde');
  if (!tarde.ok) return tarde;
  const indiceMm = indicePluviometricoDeTexto(lido.data.indiceMm);
  if (!indiceMm.ok) return indiceMm;
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    data: data.valor,
    noiteAnterior: noiteAnterior.valor,
    manha: manha.valor,
    tarde: tarde.valor,
    indiceMm: indiceMm.valor,
    chaveDeRascunho: lido.data.chaveDeRascunho ?? null,
  });
}

const esquemaObservacao = z.object({
  obraId: identificador,
  data: z.string(),
  lado: z.enum(['CROS', 'CONTRATANTE']).default('CROS'),
  texto: z.string().max(LIMITE_OBSERVACAO),
  chaveDeRascunho: z.string().min(1).max(LIMITE_ID).nullish(),
});

export function leComandoDeObservacao(
  bruto: unknown,
): Result<ComandoObservacao, ErroDeEntrada> {
  const lido = esquemaObservacao.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  if (lido.data.lado === 'CONTRATANTE') {
    // Decisão 10.1: o bloco existe no layout e sai sempre vazio na v1.
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.SEM_PERMISSAO,
        'Na v1 o bloco COMENTÁRIO CONTRATANTE sai vazio: o fluxo do contratante está fora do escopo.',
        'lado',
      ),
    );
  }
  const data = criaDiaPuro(lido.data.data);
  if (!data.ok) return data;
  const texto = exigeTextoNaoVazio(lido.data.texto, 'Escreva a observação.', 'texto');
  if (!texto.ok) return texto;
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    data: data.valor,
    texto: texto.valor,
    chaveDeRascunho: lido.data.chaveDeRascunho ?? null,
  });
}

const esquemaConteudo = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('atividade'),
    descricao: z.string().max(LIMITE_DESCRICAO),
    status: referenciaDeStatus,
  }),
  z.object({
    tipo: z.literal('producao'),
    servico: referenciaDeServico,
    quantidade: z.string().max(20),
  }),
  z.object({
    tipo: z.literal('pluviometria'),
    noiteAnterior: z.string().max(4).nullish(),
    manha: z.string().max(4).nullish(),
    tarde: z.string().max(4).nullish(),
    indiceMm: z.string().max(20),
  }),
  z.object({ tipo: z.literal('observacao'), texto: z.string().max(LIMITE_OBSERVACAO) }),
]);

function converteConteudo(
  bruto: z.infer<typeof esquemaConteudo>,
): Result<ConteudoDeLancamento, ErroDeEntrada> {
  if (bruto.tipo === 'atividade') {
    const descricao = exigeTextoNaoVazio(
      bruto.descricao,
      'Descreva a atividade.',
      'descricao',
    );
    if (!descricao.ok) return descricao;
    return ok({
      tipo: 'atividade',
      descricao: descricao.valor,
      status: converteStatus(bruto.status),
    });
  }
  if (bruto.tipo === 'producao') {
    const quantidade = deTextoDoUsuario(bruto.quantidade);
    if (!quantidade.ok) return quantidade;
    return ok({
      tipo: 'producao',
      servico: converteServico(bruto.servico),
      quantidade: quantidade.valor,
    });
  }
  if (bruto.tipo === 'pluviometria') {
    const noiteAnterior = letraDeTurnoDeTexto(bruto.noiteAnterior, 'noiteAnterior');
    if (!noiteAnterior.ok) return noiteAnterior;
    const manha = letraDeTurnoDeTexto(bruto.manha, 'manha');
    if (!manha.ok) return manha;
    const tarde = letraDeTurnoDeTexto(bruto.tarde, 'tarde');
    if (!tarde.ok) return tarde;
    const indiceMm = indicePluviometricoDeTexto(bruto.indiceMm);
    if (!indiceMm.ok) return indiceMm;
    return ok({
      tipo: 'pluviometria',
      noiteAnterior: noiteAnterior.valor,
      manha: manha.valor,
      tarde: tarde.valor,
      indiceMm: indiceMm.valor,
    });
  }
  const texto = exigeTextoNaoVazio(bruto.texto, 'Escreva a observação.', 'texto');
  if (!texto.ok) return texto;
  return ok({ tipo: 'observacao', texto: texto.valor });
}

const esquemaCorrecao = z.object({
  obraId: identificador,
  lancamentoId: identificador,
  conteudo: esquemaConteudo,
});

export function leComandoDeCorrecao(
  bruto: unknown,
): Result<ComandoCorrigir, ErroDeEntrada> {
  const lido = esquemaCorrecao.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const conteudo = converteConteudo(lido.data.conteudo);
  if (!conteudo.ok) return conteudo;
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    lancamentoId: idConfiavel<'lancamento'>(lido.data.lancamentoId),
    conteudo: conteudo.valor,
  });
}

const esquemaExclusao = z.object({
  obraId: identificador,
  lancamentoId: identificador,
  tipo: z.enum(['atividade', 'producao', 'pluviometria', 'observacao']),
});

export function leComandoDeExclusao(
  bruto: unknown,
): Result<ComandoExcluir, ErroDeEntrada> {
  const lido = esquemaExclusao.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  return ok({
    obraId: idConfiavel<'obra'>(lido.data.obraId),
    lancamentoId: idConfiavel<'lancamento'>(lido.data.lancamentoId),
    tipo: lido.data.tipo,
  });
}

const esquemaFechamento = z.object({ obraId: identificador, data: z.string() });

export function leComandoDeFechamento(
  bruto: unknown,
): Result<ComandoFecharDia, ErroDeEntrada> {
  const lido = esquemaFechamento.safeParse(bruto);
  if (!lido.success) return erro(primeiroErro(lido.error));
  const data = criaDiaPuro(lido.data.data);
  if (!data.ok) return data;
  return ok({ obraId: idConfiavel<'obra'>(lido.data.obraId), data: data.valor });
}
