/**
 * Raiz de composição do controle pluviométrico do mês.
 *
 * Liga `lancamento.instantaneoDoPeriodo` a `rdo.montaControlePluviometrico`.
 * Os dois módulos não se conhecem; a ligação é aqui, como em `rdo-diario.ts`.
 *
 * ## Autorizar antes de consultar
 *
 * `leControlePluviometricoProtegido` é a **única** entrada pública, e começa
 * por `exigeAcessoNaObra` com `'engenheiro'`. A tela não tem nome de pessoa,
 * mas tem o mês inteiro da obra numa página só, e vale para ela a mesma decisão
 * de 17/09/2026 que tirou o RDO do encarregado: ele lança o dia dele; a leitura
 * consolidada, que vai ao fiscal, é do engenheiro.
 *
 * O encarregado continua registrando os milímetros na tela do dia — é lá que o
 * pluviômetro é lido, e essa parte não mudou.
 *
 * ## Por que o mês inteiro, e não só os dias lançados
 *
 * A planilha reserva 31 linhas e deixa vazio o que não houve. Um mês com buraco
 * na sequência esconde o dia que ninguém mediu, e é justamente esse dia que o
 * fiscal pergunta. Então o intervalo vem de `diasDoMes`, e não do que existe no
 * banco.
 */

import { exigeAcessoNaObra, type Ator } from '../../modules/acesso';
import { criaLeituraDePeriodo } from '../../modules/lancamento';
import { criaRepositorioDrizzle } from '../../modules/lancamento/repositorio-drizzle';
import {
  montaControlePluviometrico,
  type ControlePluviometrico,
  type DiaDoControle,
} from '../../modules/rdo/controle-pluviometrico';
import { diasDoMes } from '../../shared/date/dia';
import { idConfiavel, type ObraId } from '../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { paraAcesso } from './ambiente-de-cadastro';
import { portasDeLancamento } from './lancamento';

/** `YYYY-MM`, como vem da URL. */
const FORMATO_DO_MES = /^(\d{4})-(\d{2})$/;

export interface MesDoControle {
  readonly ano: number;
  readonly mes: number;
}

/**
 * Lê o mês da URL. Entrada de navegador é hostil até prova em contrário: o ano
 * é limitado à faixa que um contrato de obra alcança, e o mês a 1..12.
 */
export function leMesDoControle(bruto: string): Result<MesDoControle, ErroDeDominio> {
  const casado = FORMATO_DO_MES.exec(bruto);
  if (casado === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.DIA_INVALIDO, 'O mês precisa estar no formato AAAA-MM.'),
    );
  }
  const ano = Number(casado[1]);
  const mes = Number(casado[2]);
  if (ano < 2000 || ano > 2100 || mes < 1 || mes > 12) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DIA_FORA_DO_CALENDARIO,
        'Este mês não existe no calendário.',
      ),
    );
  }
  return ok({ ano, mes });
}

export async function leControlePluviometricoProtegido(
  ator: Ator,
  bruto: { readonly obraId: string; readonly mes: string },
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Result<ControlePluviometrico, ErroDeDominio>> {
  const mes = leMesDoControle(bruto.mes);
  if (!mes.ok) return mes;

  const obraId: ObraId = idConfiavel<'obra'>(bruto.obraId);
  const permitido = await exigeAcessoNaObra(
    ator,
    obraId,
    'engenheiro',
    paraAcesso(ambiente.cadastro),
  );
  if (!permitido.ok) {
    return erro(erroDeDominio(permitido.erro.codigo, permitido.erro.mensagem));
  }

  const dias = diasDoMes(mes.valor.ano, mes.valor.mes);
  const leitura = criaLeituraDePeriodo({
    repositorio: criaRepositorioDrizzle(ambiente.conexao),
    status: portasDeLancamento(ambiente).status,
  });
  const instantaneo = await leitura.instantaneoDoPeriodo(obraId, dias);
  if (!instantaneo.ok) return instantaneo;

  // O instantâneo traz só os dias que têm leitura; a tela precisa dos 30 ou 31.
  const porData = new Map(instantaneo.valor.pluviometria.map((p) => [p.data, p]));
  const linhas: DiaDoControle[] = dias.map((data) => {
    const p = porData.get(data);
    return {
      data,
      leitura:
        p === undefined
          ? null
          : {
              noiteAnterior: p.noiteAnterior,
              manha: p.manha,
              tarde: p.tarde,
              indiceMm: p.indiceMm,
            },
    };
  });

  return ok(montaControlePluviometrico(linhas));
}
