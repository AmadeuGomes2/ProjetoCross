/**
 * O aviso de impacto conta a verdade.
 *
 * Um aviso que erra o número é pior do que não avisar: quem lê uma vez "18 dias
 * lançados" e descobre que eram 3 para de ler o aviso seguinte. Por isso cada
 * caso aqui monta um cenário com números conhecidos e confere o que sai.
 *
 * As expectativas vêm da regra, não da implementação:
 *
 * - a pessoa aparece nos dias cobertos pela **passagem** dela, com as duas
 *   pontas inclusive — é a mesma regra do efetivo (decisão 1.1), e errar `<`
 *   por `≤` aqui daria um aviso que discorda do RDO;
 * - dia sem lançamento nenhum não conta, porque não há RDO para impactar;
 * - o cabeçalho da obra impacta **todos** os dias, porque sai em todo RDO;
 * - período de BM'S impacta só a janela dele;
 * - quem não tem acesso à obra não recebe número nenhum: contagem também é
 *   informação sobre a obra.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  criaAmbienteDaComposicao,
  defineAmbienteParaTeste,
  restauraAmbientePadrao,
} from '../src/app/_composicao/ambiente';
import {
  cadastraPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  listaPeriodosBmsProtegida,
  listaPessoalProtegida,
} from '../src/app/_composicao/cadastro';
import {
  houveImpacto,
  impactoDaPessoa,
  impactoDoCabecalho,
  impactoDoPeriodoBms,
} from '../src/app/_composicao/impacto';
import { casosDeLancamento } from '../src/app/_composicao/lancamento';
import type { Ator } from '../src/modules/acesso';
import type { ObraId } from '../src/shared/id';
import { relogioFixo } from './fixtures/banco-de-teste';
import {
  AGORA,
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

let cenario: Cenario;
let obraId: ObraId;
let engenheira: Ator;
let estranho: Ator;

/** Declara o dia como trabalhado, que é o que cria a linha de `dia_de_obra`. */
async function lancaODia(data: string): Promise<void> {
  const r = await casosDeLancamento().recebeConfirmacaoDoDia(
    { obraId, data, estado: 'trabalhado', indiceMm: '0' },
    engenheira,
  );
  if (!r.ok) throw new Error(`não lancei ${data}: ${r.erro.mensagem}`);
}

beforeEach(() => {
  cenario = montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));
  engenheira = cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = criaObraDoPrd(engenheira, cenario.amb);
  estranho = cenario.novoAtor('estranho@exemplo.invalido');
});

afterEach(() => {
  restauraAmbientePadrao();
  cenario.fecha();
});

describe('impacto de mexer numa pessoa', () => {
  it('conta os dias lançados cobertos pela passagem, com as duas pontas', async () => {
    cadastraPessoaProtegida(
      engenheira,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-09-02', saida: '2026-09-04' },
      cenario.amb,
    );
    await lancaODia('2026-09-01'); // antes da entrada
    await lancaODia('2026-09-02'); // primeiro dia: conta
    await lancaODia('2026-09-03');
    await lancaODia('2026-09-04'); // último dia: conta
    await lancaODia('2026-09-05'); // depois da saída

    const pessoas = listaPessoalProtegida(engenheira, obraId, cenario.amb);
    const pessoaId = pessoas.ok ? (pessoas.valor[0]?.pessoaId ?? '') : '';

    const impacto = impactoDaPessoa(engenheira, obraId, pessoaId);

    expect(impacto.diasLancados).toBe(3);
  });

  it('não conta dia que ninguém lançou: não há RDO para impactar', async () => {
    cadastraPessoaProtegida(
      engenheira,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-09-02' },
      cenario.amb,
    );
    await lancaODia('2026-09-02');
    // 03, 04 e 05 ficam sem lançamento, embora a passagem os cubra.

    const pessoas = listaPessoalProtegida(engenheira, obraId, cenario.amb);
    const pessoaId = pessoas.ok ? (pessoas.valor[0]?.pessoaId ?? '') : '';

    const impacto = impactoDaPessoa(engenheira, obraId, pessoaId);

    expect(impacto.diasLancados).toBe(1);
    expect(impacto.diasFechados).toBe(0);
    expect(impacto.exportacoes).toBe(0);
  });

  it('pessoa sem nenhum dia lançado não dispara aviso', () => {
    cadastraPessoaProtegida(
      engenheira,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-09-02' },
      cenario.amb,
    );
    const pessoas = listaPessoalProtegida(engenheira, obraId, cenario.amb);
    const pessoaId = pessoas.ok ? (pessoas.valor[0]?.pessoaId ?? '') : '';

    const impacto = impactoDaPessoa(engenheira, obraId, pessoaId);

    expect(houveImpacto(impacto)).toBe(false);
  });
});

describe('impacto de mexer no cabeçalho da obra', () => {
  it('alcança todos os dias lançados, porque o cabeçalho sai em todo RDO', async () => {
    await lancaODia('2026-09-01');
    await lancaODia('2026-09-02');
    await lancaODia('2026-09-03');

    const impacto = impactoDoCabecalho(engenheira, obraId);

    expect(impacto.diasLancados).toBe(3);
  });

  it('obra sem dia lançado não dispara aviso', () => {
    expect(houveImpacto(impactoDoCabecalho(engenheira, obraId))).toBe(false);
  });
});

describe('impacto de mexer num período de BM,S', () => {
  it('conta só os dias dentro da janela do período', async () => {
    cadastraPeriodoBmsProtegido(
      engenheira,
      obraId,
      { numero: '7', dataInicial: '2026-09-02', dataFinal: '2026-09-03' },
      cenario.amb,
    );
    await lancaODia('2026-09-01'); // fora
    await lancaODia('2026-09-02'); // dentro
    await lancaODia('2026-09-03'); // dentro
    await lancaODia('2026-09-04'); // fora

    // A obra do PRD já nasce com BM'S 1, de fevereiro (decisão 21.1: ao menos
    // um período é obrigatório). Pegar o índice 0 pegaria aquele, e o teste
    // mediria a janela errada — foi o que aconteceu na primeira escrita.
    const periodos = listaPeriodosBmsProtegida(engenheira, obraId, cenario.amb);
    const periodoId = periodos.ok
      ? (periodos.valor.find((periodo) => periodo.numero === 7)?.id ?? '')
      : '';
    expect(periodoId).not.toBe('');

    const impacto = impactoDoPeriodoBms(engenheira, obraId, periodoId);

    expect(impacto.diasLancados).toBe(2);
  });
});

describe('a fronteira da obra vale também para contagem', () => {
  it('não devolve número nenhum a quem não tem acesso', async () => {
    await lancaODia('2026-09-01');
    await lancaODia('2026-09-02');

    const impacto = impactoDoCabecalho(estranho, obraId);

    expect(impacto.diasLancados).toBe(0);
    expect(houveImpacto(impacto)).toBe(false);
  });
});
