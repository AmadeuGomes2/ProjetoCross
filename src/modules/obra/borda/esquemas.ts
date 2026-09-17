/**
 * A borda do módulo `obra`: onde o Zod acontece.
 *
 * docs/arquitetura/v1.md, 5.1: toda entrada vinda do navegador é hostil.
 * A validação por esquema acontece **antes** de qualquer caso de uso, com
 * `safeParse` e nunca `parse` — falha de entrada é `Result`, não exceção
 * (padroes-codigo, Erro, categoria 2).
 *
 * O Zod garante a **forma** (é objeto? os campos são texto? a lista de
 * períodos existe?). Os tipos de domínio — `DiaPuro`, `Quantidade` — são
 * produzidos por `shared`, que é onde o calendário e a escala decimal moram.
 */

import { z } from 'zod';

import { deTextoDoUsuario } from '../../../shared/decimal';
import { idConfiavel, type ObraId, type ServicoControladoId } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  ok,
  type ErroDeEntrada,
  type Result,
} from '../../../shared/result';
import type {
  ComandoCriarObra,
  ComandoEditarObra,
  PeriodoBmsNovo,
  ResponsavelTecnico,
} from '../tipos';
import type { ComandoPeriodoBms } from '../periodo-bms';
import type { ComandoQuantidadeProjeto } from '../servico-controlado';
import { exigeDia, exigeInteiroNaoNegativo, exigeTexto } from './campos';

const formaDoPeriodo = z.object({
  numero: z.unknown(),
  dataInicial: z.unknown(),
  dataFinal: z.unknown(),
});

const formaDeCriarObra = z.object({
  contrato: z.unknown(),
  contratante: z.unknown(),
  contratada: z.unknown(),
  dataInicio: z.unknown(),
  dataTermino: z.unknown(),
  escopo: z.unknown(),
  nomeProjeto: z.unknown(),
  area: z.unknown(),
  local: z.unknown(),
  respTecnicoNome: z.unknown().optional(),
  respTecnicoTitulo: z.unknown().optional(),
  respTecnicoCrea: z.unknown().optional(),
  periodosBms: z.array(formaDoPeriodo),
});

function formaInvalida(): ErroDeEntrada {
  return erroDeEntrada(
    CODIGO_ERRO.TERMO_VAZIO,
    'O formulário chegou incompleto. Recarregue a página e tente de novo.',
  );
}

/** Os nove campos do cabeçalho, na ordem do gabarito, com o rótulo em português. */
const CAMPOS_DO_CABECALHO = [
  ['contrato', 'o contrato'],
  ['contratante', 'o contratante'],
  ['contratada', 'a contratada'],
  ['escopo', 'o escopo'],
  ['nomeProjeto', 'o nome do projeto'],
  ['area', 'a área'],
  ['local', 'o local'],
] as const;

type ChaveDeTexto = (typeof CAMPOS_DO_CABECALHO)[number][0];

function analisaPeriodo(
  bruto: { numero: unknown; dataInicial: unknown; dataFinal: unknown },
  indice: number,
): Result<PeriodoBmsNovo, ErroDeEntrada> {
  const prefixo = `periodosBms.${indice}`;

  const numero = exigeInteiroNaoNegativo(
    bruto.numero,
    `${prefixo}.numero`,
    'número do BMS',
  );
  if (!numero.ok) return numero;

  const dataInicial = exigeDia(bruto.dataInicial, `${prefixo}.dataInicial`);
  if (!dataInicial.ok) return dataInicial;

  const dataFinal = exigeDia(bruto.dataFinal, `${prefixo}.dataFinal`);
  if (!dataFinal.ok) return dataFinal;

  return ok({
    numero: numero.valor,
    dataInicial: dataInicial.valor,
    dataFinal: dataFinal.valor,
  });
}

/** Os nove campos do cabeçalho, sem BM'S e sem responsável técnico. */
const formaDoCabecalho = z.object({
  contrato: z.unknown(),
  contratante: z.unknown(),
  contratada: z.unknown(),
  dataInicio: z.unknown(),
  dataTermino: z.unknown(),
  escopo: z.unknown(),
  nomeProjeto: z.unknown(),
  area: z.unknown(),
  local: z.unknown(),
});

export function analisaCriarObra(
  bruto: unknown,
): Result<ComandoCriarObra, ErroDeEntrada> {
  const forma = formaDeCriarObra.safeParse(bruto);
  if (!forma.success) return erro(formaInvalida());
  const dados = forma.data;

  const textos: Partial<Record<ChaveDeTexto, string>> = {};
  for (const [campo, rotulo] of CAMPOS_DO_CABECALHO) {
    const valor = exigeTexto(dados[campo], campo, rotulo);
    if (!valor.ok) return valor;
    textos[campo] = valor.valor;
  }

  const dataInicio = exigeDia(dados.dataInicio, 'dataInicio');
  if (!dataInicio.ok) return dataInicio;
  const dataTermino = exigeDia(dados.dataTermino, 'dataTermino');
  if (!dataTermino.ok) return dataTermino;

  const periodos: PeriodoBmsNovo[] = [];
  for (const [indice, cru] of dados.periodosBms.entries()) {
    const periodo = analisaPeriodo(cru, indice);
    if (!periodo.ok) return periodo;
    periodos.push(periodo.valor);
  }

  // Decisão 32.1, de 16/09/2026: os três campos do bloco 11 são exigidos na
  // criação. Antes havia um caminho "nenhum dos três preenchido vira nulo", e
  // era por ele que nascia a obra cujo PDF sai com o rodapé de assinatura em
  // branco — que é justamente o campo que o fiscal assina de volta.
  const resp = analisaResponsavelTecnico(dados);
  if (!resp.ok) return resp;

  return ok({
    contrato: textos.contrato ?? '',
    contratante: textos.contratante ?? '',
    contratada: textos.contratada ?? '',
    dataInicio: dataInicio.valor,
    dataTermino: dataTermino.valor,
    escopo: textos.escopo ?? '',
    nomeProjeto: textos.nomeProjeto ?? '',
    area: textos.area ?? '',
    local: textos.local ?? '',
    respTecnico: resp.valor,
    periodosBms: periodos,
  });
}

export function analisaResponsavelTecnico(bruto: {
  respTecnicoNome?: unknown;
  respTecnicoTitulo?: unknown;
  respTecnicoCrea?: unknown;
}): Result<ResponsavelTecnico, ErroDeEntrada> {
  const nome = exigeTexto(
    bruto.respTecnicoNome,
    'respTecnicoNome',
    'o nome do responsável técnico',
  );
  if (!nome.ok) return nome;
  const titulo = exigeTexto(
    bruto.respTecnicoTitulo,
    'respTecnicoTitulo',
    'a titulação do responsável técnico',
  );
  if (!titulo.ok) return titulo;
  const crea = exigeTexto(bruto.respTecnicoCrea, 'respTecnicoCrea', 'o registro no CREA');
  if (!crea.ok) return crea;

  return ok({ nome: nome.valor, titulo: titulo.valor, crea: crea.valor });
}

const formaDePeriodoAvulso = z.object({
  obraId: z.string(),
  numero: z.unknown(),
  dataInicial: z.unknown(),
  dataFinal: z.unknown(),
});

export function analisaPeriodoBms(
  bruto: unknown,
): Result<ComandoPeriodoBms, ErroDeEntrada> {
  const forma = formaDePeriodoAvulso.safeParse(bruto);
  if (!forma.success) return erro(formaInvalida());

  const periodo = analisaPeriodo(forma.data, 0);
  if (!periodo.ok) return periodo;

  return ok({ obraId: idConfiavel<'obra'>(forma.data.obraId), ...periodo.valor });
}

const formaDeQuantidade = z.object({
  obraId: z.string(),
  servicoId: z.string(),
  quantidade: z.unknown(),
});

/**
 * Quantidade de projeto.
 *
 * `deTextoDoUsuario` aceita vírgula, rejeita mais de três casas e rejeita zero
 * e negativo (decisão 13.4). Arredondar calado é como se perde tonelada de
 * asfalto na conta, e zero é exatamente o valor que dividiria o percentual por
 * zero.
 */
export function analisaQuantidadeDeProjeto(
  bruto: unknown,
): Result<ComandoQuantidadeProjeto, ErroDeEntrada> {
  const forma = formaDeQuantidade.safeParse(bruto);
  if (!forma.success) return erro(formaInvalida());

  const cru = forma.data.quantidade;
  if (typeof cru !== 'string' && typeof cru !== 'number') {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.QUANTIDADE_INVALIDA,
        'Informe a quantidade de projeto.',
        'quantidade',
      ),
    );
  }

  const quantidade = deTextoDoUsuario(String(cru));
  if (!quantidade.ok) {
    return erro(
      erroDeEntrada(quantidade.erro.codigo, quantidade.erro.mensagem, 'quantidade'),
    );
  }

  const obraId: ObraId = idConfiavel<'obra'>(forma.data.obraId);
  const servicoId: ServicoControladoId = idConfiavel<'servico_controlado'>(
    forma.data.servicoId,
  );
  return ok({ obraId, servicoId, quantidade: quantidade.valor });
}

/**
 * Editar o cabeçalho (17/09/2026).
 *
 * Os mesmos nove campos de `analisaCriarObra`, **sem** período de BM'S e sem
 * responsável técnico: os dois têm caminho próprio, e exigi-los aqui obrigaria
 * a reenviar o que não se está mexendo — que é como um formulário de edição
 * apaga dado sem querer.
 */
export function analisaEditarObra(
  bruto: unknown,
): Result<Omit<ComandoEditarObra, 'obraId'>, ErroDeEntrada> {
  const forma = formaDoCabecalho.safeParse(bruto);
  if (!forma.success) return erro(formaInvalida());
  const dados = forma.data;

  const textos: Partial<Record<ChaveDeTexto, string>> = {};
  for (const [campo, rotulo] of CAMPOS_DO_CABECALHO) {
    const valor = exigeTexto(dados[campo], campo, rotulo);
    if (!valor.ok) return valor;
    textos[campo] = valor.valor;
  }

  const dataInicio = exigeDia(dados.dataInicio, 'dataInicio');
  if (!dataInicio.ok) return dataInicio;
  const dataTermino = exigeDia(dados.dataTermino, 'dataTermino');
  if (!dataTermino.ok) return dataTermino;

  return ok({
    contrato: textos.contrato ?? '',
    contratante: textos.contratante ?? '',
    contratada: textos.contratada ?? '',
    dataInicio: dataInicio.valor,
    dataTermino: dataTermino.valor,
    escopo: textos.escopo ?? '',
    nomeProjeto: textos.nomeProjeto ?? '',
    area: textos.area ?? '',
    local: textos.local ?? '',
  });
}
