/**
 * O que uma alteração de cadastro impacta — e o que ela **não** impacta.
 *
 * Regra do dono do produto, 17/09/2026: *"toda vez que alguém editar ou
 * excluir uma informação que foi cadastrada em algum RDO deve aparecer um aviso
 * que existem lançamentos em RDO, mas que não serão afetados; para excluir algo
 * de um RDO, somente acessando o RDO e excluindo manualmente"*.
 *
 * Duas coisas, então:
 *
 * 1. **Alteração de cadastro é sempre daqui para frente.** Encerrar a passagem
 *    de uma pessoa não a apaga dos dias já lançados; trocar a função abre uma
 *    passagem nova em vez de reescrever a antiga (decisão 29.1, que já
 *    funcionava assim). Este arquivo não muda esse comportamento — ele o torna
 *    **visível antes do clique**.
 * 2. **O aviso precisa dizer o tamanho.** "Existem lançamentos" não ajuda
 *    ninguém a decidir; "18 dias lançados, 12 fechados, 4 RDOs já exportados"
 *    ajuda.
 *
 * ## Por que esta leitura mora na composição
 *
 * Ela atravessa módulos de propósito: pessoa e equipamento são de `pessoal` e
 * `equipamento`, o dia lançado é de `lancamento`, a trilha é de `export`.
 * Nenhum módulo pode importar outro (arquitetura 4.1), e um módulo novo só para
 * contar seria uma quinta verdade sobre "o que é um dia lançado".
 *
 * É **leitura, nunca regra**: ninguém decide nada a partir daqui. O servidor
 * continua recusando o que tem de recusar, com ou sem aviso na tela.
 *
 * Autoriza antes de ler, como toda leitura protegida deste projeto.
 */

import { and, count, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { exigeAcessoNaObra, type Ator } from '../../modules/acesso';
import {
  diaDeObra,
  passagemEquipamento,
  passagemPessoa,
  periodoBms,
  registroExportacao,
} from '../../db/schema';
import type { DiaPuro } from '../../shared/date/dia';
import { algumaPassagemCobreODia } from '../../shared/date/intervalo';
import { idConfiavel, type ObraId } from '../../shared/id';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { paraAcesso } from './ambiente-de-cadastro';

/**
 * O tamanho do rastro que uma alteração encontra pela frente.
 *
 * Os três números respondem perguntas diferentes, e por isso nenhum substitui
 * o outro: quantos dias existem, quantos já estão fechados (e portanto só mudam
 * por retificação), e quantos já saíram em documento para o fiscal.
 */
export interface Impacto {
  readonly diasLancados: number;
  readonly diasFechados: number;
  readonly exportacoes: number;
}

const NADA: Impacto = { diasLancados: 0, diasFechados: 0, exportacoes: 0 };

/**
 * Conta os dias lançados da obra dentro de uma janela, e o que já saiu deles.
 *
 * `de` e `ate` nulos significam "a obra inteira" — é o caso do cabeçalho, que
 * aparece em todo RDO.
 */
async function contaNaJanela(
  ambiente: AmbienteDaComposicao,
  obraId: ObraId,
  de: DiaPuro | null,
  ate: DiaPuro | null,
): Promise<Impacto> {
  const db = ambiente.cadastro.db;
  const limites = [
    eq(diaDeObra.obraId, obraId),
    ...(de === null ? [] : [gte(diaDeObra.data, de)]),
    ...(ate === null ? [] : [lte(diaDeObra.data, ate)]),
  ];

  // As duas contagens não dependem uma da outra e não estão em transação: em
  // série seriam duas idas à rede em fila, e o aviso aparece no clique de quem
  // está editando o cadastro. `Promise.all` cabe aqui — e **só** aqui, porque
  // `impactoDasPassagens` precisa dos dias antes de saber o que contar.
  const [dias, exportacoes] = await Promise.all([
    db
      .select({
        total: count(),
        fechados: sql<number>`sum(case when ${diaDeObra.fechadoEm} is not null then 1 else 0 end)`,
      })
      .from(diaDeObra)
      .where(and(...limites)),
    db
      .select({ total: count() })
      .from(registroExportacao)
      .where(
        and(
          eq(registroExportacao.obraId, obraId),
          ...(de === null ? [] : [gte(registroExportacao.dataRdo, de)]),
          ...(ate === null ? [] : [lte(registroExportacao.dataRdo, ate)]),
        ),
      ),
  ]);

  return {
    diasLancados: dias[0]?.total ?? 0,
    // `sum` de zero linhas devolve NULL, e o driver do Postgres entrega
    // `numeric` como texto: o `Number` cobre os dois casos.
    diasFechados: Number(dias[0]?.fechados ?? 0),
    exportacoes: exportacoes[0]?.total ?? 0,
  };
}

/**
 * Sem acesso à obra, nenhum número. Contagem também é informação.
 *
 * Sempre em série com o que vem depois, e nunca dentro de um `Promise.all` com
 * a leitura que ela protege: autorizar e ler ao mesmo tempo é ler sem autorizar.
 */
async function autorizado(
  ator: Ator,
  obraId: ObraId,
  ambiente: AmbienteDaComposicao,
): Promise<boolean> {
  const permitido = await exigeAcessoNaObra(
    ator,
    obraId,
    'encarregado',
    paraAcesso(ambiente.cadastro),
  );
  return permitido.ok;
}

/**
 * Impacto de mexer nas informações gerais da obra.
 *
 * O cabeçalho sai em **todo** RDO, então a janela é a obra inteira. O dono do
 * produto decidiu em 17/09/2026 que a correção vale para todos, inclusive os
 * já emitidos — daí o aviso precisar dizer quantos documentos já saíram com o
 * texto antigo.
 */
export async function impactoDoCabecalho(
  ator: Ator,
  obraId: ObraId,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Impacto> {
  if (!(await autorizado(ator, obraId, ambiente))) return NADA;
  return contaNaJanela(ambiente, obraId, null, null);
}

/**
 * Impacto de mexer num período de BM'S.
 *
 * A janela é o próprio período. Excluí-lo faz os RDOs daqueles dias saírem com
 * o campo `BM'S` vazio e aviso na tela — que é o comportamento que a decisão
 * 21.1 já definiu para dia fora de período. Nenhum lançamento se perde.
 */
export async function impactoDoPeriodoBms(
  ator: Ator,
  obraId: ObraId,
  periodoId: string,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Impacto> {
  if (!(await autorizado(ator, obraId, ambiente))) return NADA;

  const achados = await ambiente.cadastro.db
    .select({ inicial: periodoBms.dataInicial, final: periodoBms.dataFinal })
    .from(periodoBms)
    .where(
      and(
        eq(periodoBms.obraId, obraId),
        eq(periodoBms.id, idConfiavel<'periodo_bms'>(periodoId)),
      ),
    );

  const periodo = achados[0];
  if (periodo === undefined) return NADA;
  return contaNaJanela(ambiente, obraId, periodo.inicial, periodo.final);
}

/**
 * Impacto de mexer numa pessoa.
 *
 * Conta os dias lançados cobertos por **alguma** passagem dela. Um dia só conta
 * uma vez, mesmo que a pessoa tenha duas passagens no mesmo dia — o que não
 * deveria acontecer, mas contar duas vezes daria um número maior que o total de
 * dias da obra, e um aviso que exagera deixa de ser lido.
 */
export async function impactoDaPessoa(
  ator: Ator,
  obraId: ObraId,
  pessoaId: string,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Impacto> {
  if (!(await autorizado(ator, obraId, ambiente))) return NADA;

  const passagens = await ambiente.cadastro.db
    .select({ entrada: passagemPessoa.entrada, saida: passagemPessoa.saida })
    .from(passagemPessoa)
    .where(
      and(
        eq(passagemPessoa.obraId, obraId),
        eq(passagemPessoa.pessoaId, idConfiavel<'pessoa'>(pessoaId)),
      ),
    );

  return impactoDasPassagens(ambiente, obraId, passagens);
}

/** Impacto de mexer num equipamento. Mesma regra da pessoa. */
export async function impactoDoEquipamento(
  ator: Ator,
  obraId: ObraId,
  equipamentoId: string,
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Impacto> {
  if (!(await autorizado(ator, obraId, ambiente))) return NADA;

  const passagens = await ambiente.cadastro.db
    .select({
      entrada: passagemEquipamento.entrada,
      saida: passagemEquipamento.saida,
    })
    .from(passagemEquipamento)
    .where(
      and(
        eq(passagemEquipamento.obraId, obraId),
        eq(passagemEquipamento.equipamentoId, idConfiavel<'equipamento'>(equipamentoId)),
      ),
    );

  return impactoDasPassagens(ambiente, obraId, passagens);
}

/**
 * Une as janelas das passagens sem contar dia duas vezes.
 *
 * Feito em memória, sobre as datas dos dias lançados, porque a alternativa —
 * um `OR` de N intervalos em SQL — cresce com o número de passagens e fica
 * ilegível. A obra tem dezenas de dias, não milhões.
 */
async function impactoDasPassagens(
  ambiente: AmbienteDaComposicao,
  obraId: ObraId,
  passagens: readonly { entrada: string; saida: string | null }[],
): Promise<Impacto> {
  if (passagens.length === 0) return NADA;

  const dias = await ambiente.cadastro.db
    .select({ data: diaDeObra.data, fechadoEm: diaDeObra.fechadoEm })
    .from(diaDeObra)
    .where(eq(diaDeObra.obraId, obraId));

  /*
   * `algumaPassagemCobreODia` de `shared/date/intervalo.ts`, que se declara a
   * ÚNICA implementação desta regra — e é, por um motivo concreto: a versão
   * que eu tinha escrito aqui à mão não tinha o guarda de intervalo invertido.
   * O BM'S 4 da planilha real tem **-716 dias**, fim antes do início; com dado
   * assim, a cópia contaria dias que não existem e o aviso mentiria o número.
   */
  const cobertos = dias.filter((d) => algumaPassagemCobreODia(passagens, d.data));

  if (cobertos.length === 0) return NADA;

  // Em série, e não em paralelo com a leitura acima: o `inArray` é montado com
  // as datas que acabaram de sair dela.
  const exportacoes = await ambiente.cadastro.db
    .select({ total: count() })
    .from(registroExportacao)
    .where(
      and(
        eq(registroExportacao.obraId, obraId),
        inArray(
          registroExportacao.dataRdo,
          cobertos.map((d) => d.data),
        ),
      ),
    );

  return {
    diasLancados: cobertos.length,
    diasFechados: cobertos.filter((d) => d.fechadoEm !== null).length,
    exportacoes: exportacoes[0]?.total ?? 0,
  };
}

/** Houve alguma coisa? Atalho para a tela decidir se mostra o aviso. */
export function houveImpacto(impacto: Impacto): boolean {
  return impacto.diasLancados > 0;
}
