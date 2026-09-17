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
  cadastraEquipamentoProtegido,
  cadastraPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  listaEquipamentosProtegida,
  listaPeriodosBmsProtegida,
  listaPessoalProtegida,
} from '../src/app/_composicao/cadastro';
import {
  houveImpacto,
  impactoDaPessoa,
  impactoDoCabecalho,
  impactoDoEquipamento,
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

beforeEach(async () => {
  cenario = await montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));
  engenheira = await cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = await criaObraDoPrd(engenheira, cenario.amb);
  estranho = await cenario.novoAtor('estranho@exemplo.invalido');
});

afterEach(async () => {
  restauraAmbientePadrao();
  await cenario.fecha();
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
    const pessoaId = (await pessoas.ok) ? (pessoas.valor[0]?.pessoaId ?? '') : '';

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
    const pessoaId = (await pessoas.ok) ? (pessoas.valor[0]?.pessoaId ?? '') : '';

    const impacto = impactoDaPessoa(engenheira, obraId, pessoaId);

    expect(impacto.diasLancados).toBe(1);
    expect(impacto.diasFechados).toBe(0);
    expect(impacto.exportacoes).toBe(0);
  });

  it('pessoa sem nenhum dia lançado não dispara aviso', async () => {
    cadastraPessoaProtegida(
      engenheira,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-09-02' },
      cenario.amb,
    );
    const pessoas = listaPessoalProtegida(engenheira, obraId, cenario.amb);
    const pessoaId = (await pessoas.ok) ? (pessoas.valor[0]?.pessoaId ?? '') : '';

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

  it('obra sem dia lançado não dispara aviso', async () => {
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
    const periodoId = (await periodos.ok)
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

describe('os números que o aviso mostra, quando não são zero', () => {
  it('conta os dias fechados separados dos abertos', async () => {
    await lancaODia('2026-09-01');
    await lancaODia('2026-09-02');
    await lancaODia('2026-09-03');
    // Fecha dois dos três. Fechar é do engenheiro (9.1).
    for (const data of ['2026-09-01', '2026-09-02']) {
      const r = await casosDeLancamento().recebeFechamento({ obraId, data }, engenheira);
      if (!r.ok) throw new Error(`não fechei ${data}: ${r.erro.mensagem}`);
    }

    const impacto = impactoDoCabecalho(engenheira, obraId);

    expect(impacto.diasLancados).toBe(3);
    expect(impacto.diasFechados).toBe(2);
  });

  it('conta o equipamento pelos dias da passagem dele', async () => {
    cadastraEquipamentoProtegido(
      engenheira,
      obraId,
      {
        identificador: 'TR-77',
        tipo: 'TRATOR',
        entrada: '2026-09-02',
        saida: '2026-09-03',
      },
      cenario.amb,
    );
    await lancaODia('2026-09-01'); // antes
    await lancaODia('2026-09-02'); // dentro
    await lancaODia('2026-09-03'); // dentro, último dia
    await lancaODia('2026-09-04'); // depois

    const frota = listaEquipamentosProtegida(engenheira, obraId, cenario.amb);
    const equipamentoId = (await frota.ok) ? (frota.valor[0]?.equipamentoId ?? '') : '';
    expect(equipamentoId).not.toBe('');

    const impacto = impactoDoEquipamento(engenheira, obraId, equipamentoId);

    expect(impacto.diasLancados).toBe(2);
  });

  it('não consegue nem criar passagem com saída anterior à entrada', async () => {
    /*
     * O BM'S 4 da planilha real tem **-716 dias**: fim antes do início, e
     * ninguém viu porque nada validava. A tentativa de reproduzir esse dado
     * aqui mostrou que **o esquema recusa**, por `ck_passagem_pessoa_intervalo`.
     *
     * O caso fica registrado porque foi assim que se descobriu: o aviso de
     * impacto tinha uma cópia manual da regra de cobertura, sem o guarda de
     * inversão. A cópia foi trocada por `algumaPassagemCobreODia`, de
     * `shared/date/intervalo.ts`, mas a primeira linha de defesa é esta — o
     * dado torto não entra.
     */
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO pessoa (id, obra_id, nome, criado_por, criado_em)
         VALUES (?, ?, 'P9', ?, ?)`,
      )
      .run('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', obraId, engenheira.usuarioId, AGORA);
    const funcao = cenario.conexao.sqlite
      .prepare('SELECT id FROM funcao LIMIT 1')
      .get() as { id: string };

    const invertida = () =>
      cenario.conexao.sqlite
        .prepare(
          `INSERT INTO passagem_pessoa
             (id, obra_id, pessoa_id, funcao_id, entrada, saida, registrado_por, registrado_em)
           VALUES (?, ?, ?, ?, '2026-09-10', '2026-09-01', ?, ?)`,
        )
        .run(
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          obraId,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          funcao.id,
          engenheira.usuarioId,
          AGORA,
        );

    expect(invertida).toThrow(/ck_passagem_pessoa_intervalo/);
  });
});
