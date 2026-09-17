/**
 * A ligação do RDO de período: **autoriza antes de ler**, pelo caminho real.
 *
 * Nada aqui é dublê: banco em memória com as migrations aplicadas, os casos de
 * uso de verdade e a composição de verdade. É a pergunta que teste de módulo
 * não responde — as peças estão ligadas, e a porta está trancada?
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - decisão 27.1 (`CLAUDE.md`, Segurança; `docs/arquitetura/periodo.md`, PP-1):
 *   o consolidado e a exportação dele são **do engenheiro**. O encarregado
 *   lança o dia; conferir e entregar ao fiscal é do engenheiro;
 * - `docs/arquitetura/v1.md`, 4.9: obra inexistente e obra sem acesso devolvem
 *   o **mesmo** erro, para não revelar existência;
 * - `CLAUDE.md`, Segurança: "erro nunca vaza nome de pessoa. Nem em log, nem em
 *   mensagem, nem em URL". Daí o caso que lê a mensagem da recusa;
 * - `docs/arquitetura/periodo.md`, DP1: o conjunto `{02, 05, 09}` não traz o
 *   dia 03, que existe e foi lançado;
 * - `docs/arquitetura/periodo.md`, DP6: o `ACUM.` vai até o último dia do
 *   conjunto, **sobre todos os dias**, inclusive os que ficaram de fora;
 * - decisão 4.2 (`regras-rdo` §5): dia não lançado é ausência de registro, e
 *   não um dia parado nem um zero fabricado.
 *
 * Dado sintético: `P1`, `R1` e os endereços `exemplo.invalido` são rótulos do
 * PRD, não pessoas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cadastraPeriodoBmsProtegido, listaServicosProtegida } from './cadastro';
import {
  criaAmbienteDaComposicao,
  defineAmbienteParaTeste,
  restauraAmbientePadrao,
} from './ambiente';
import { casosDeLancamento, portasDeLancamento } from './lancamento';
import {
  portasDoRdoDePeriodoProtegidas,
  type PortasDoRdoDePeriodo,
} from './rdo-de-periodo';
import type { Ator } from '../../modules/acesso';
import { diaPuroConfiavel, type DiaPuro } from '../../shared/date/dia';
import type { ObraId, ServicoControladoId } from '../../shared/id';
import { relogioFixo } from '../../../test/fixtures/banco-de-teste';
import {
  AGORA,
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';

const D02 = diaPuroConfiavel('2026-09-02');
const D03 = diaPuroConfiavel('2026-09-03');
const D05 = diaPuroConfiavel('2026-09-05');
const D09 = diaPuroConfiavel('2026-09-09');

/** O conjunto não contíguo do contrato: três RDOs, 02, 05 e 09. */
const CONJUNTO: readonly DiaPuro[] = [D02, D05, D09];

const EMAIL_DO_ESTRANHO = 'estranho@exemplo.invalido';

let cenario: Cenario;
let obraId: ObraId;
let engenheira: Ator;
let encarregado: Ator;
let estranho: Ator;
let servicoId: ServicoControladoId;

function exige<T>(resultado: { ok: boolean }, oQue: string): T {
  if (!resultado.ok) {
    const comErro = resultado as { erro?: { mensagem?: string } };
    throw new Error(`${oQue}: ${comErro.erro?.mensagem ?? 'recusado'}`);
  }
  return (resultado as unknown as { valor: T }).valor;
}

/** Libera o encarregado por SQL cru: o convite tem teste próprio. */
function daAcessoDeEncarregado(ator: Ator, acessoId: string): Ator {
  cenario.conexao.sqlite
    .prepare(
      `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
       VALUES (?, ?, ?, 'encarregado', ?, ?)`,
    )
    .run(acessoId, obraId, ator.usuarioId, engenheira.usuarioId, AGORA);
  return ator;
}

async function portasDe(
  ator: Ator,
  dias: readonly DiaPuro[] = CONJUNTO,
  obra: ObraId = obraId,
): Promise<PortasDoRdoDePeriodo> {
  return exige<PortasDoRdoDePeriodo>(
    await portasDoRdoDePeriodoProtegidas(ator, obra, dias),
    'portas do período',
  );
}

beforeEach(async () => {
  cenario = await montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));

  engenheira = await cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = await criaObraDoPrd(engenheira, cenario.amb);
  encarregado = await daAcessoDeEncarregado(
    await cenario.novoAtor('enc@exemplo.invalido'),
    '99999999-9999-4999-8999-999999999999',
  );
  estranho = await cenario.novoAtor(EMAIL_DO_ESTRANHO);

  exige(
    cadastraPeriodoBmsProtegido(
      engenheira,
      obraId,
      { numero: 8, dataInicial: '2026-09-01', dataFinal: '2026-09-30' },
      cenario.amb,
    ),
    'período de BMS de setembro',
  );

  const servicos = exige<{ servicoId: ServicoControladoId }[]>(
    listaServicosProtegida(engenheira, obraId, cenario.amb),
    'serviços controlados',
  );
  const primeiro = servicos[0];
  if (primeiro === undefined) throw new Error('A obra nasceu sem serviço controlado.');
  servicoId = primeiro.servicoId;

  const casos = casosDeLancamento(portasDeLancamento());
  for (const [data, descricao] of [
    [D02, 'Fresagem da Rua A'],
    [D03, 'Fresagem da Rua B'],
    [D05, 'Fresagem da Rua C'],
  ] as const) {
    exige(
      await casos.recebeAtividade(
        { obraId, data, descricao, status: { tipo: 'termo', termo: 'Produção' } },
        engenheira,
      ),
      `atividade de ${data}`,
    );
  }
  // O dia 09 está no conjunto e ninguém lançou nada nele: é a ausência.
  exige(
    await casos.recebeProducao(
      { obraId, data: D02, servico: { tipo: 'id', id: servicoId }, quantidade: '100' },
      engenheira,
    ),
    'produção do dia 02',
  );
  exige(
    await casos.recebeProducao(
      { obraId, data: D03, servico: { tipo: 'id', id: servicoId }, quantidade: '30' },
      engenheira,
    ),
    'produção do dia 03',
  );
  exige(
    await casos.recebePluviometria(
      { obraId, data: D05, noiteAnterior: 'B', manha: 'C', tarde: 'B', indiceMm: '12' },
      engenheira,
    ),
    'pluviometria do dia 05',
  );
  exige(
    await casos.recebeObservacao(
      { obraId, data: D05, texto: 'Frente liberada pela fiscalização.' },
      engenheira,
    ),
    'observação do dia 05',
  );
});

afterEach(async () => {
  restauraAmbientePadrao();
  await cenario.fecha();
});

describe('a leitura do período é do engenheiro', () => {
  it('entrega as portas ao engenheiro da obra', async () => {
    const resultado = await portasDoRdoDePeriodoProtegidas(engenheira, obraId, CONJUNTO);

    expect(resultado.ok).toBe(true);
  });

  it('recusa o encarregado, que lança o dia mas não entrega o consolidado', async () => {
    const resultado = await portasDoRdoDePeriodoProtegidas(encarregado, obraId, CONJUNTO);

    expect(resultado.ok).toBe(false);
  });

  it('recusa quem não tem acesso nenhum à obra', async () => {
    const resultado = await portasDoRdoDePeriodoProtegidas(estranho, obraId, CONJUNTO);

    expect(resultado.ok).toBe(false);
  });

  it('recusa com a mesma mensagem do encarregado, para não revelar existência', async () => {
    const doEncarregado = await portasDoRdoDePeriodoProtegidas(
      encarregado,
      obraId,
      CONJUNTO,
    );
    const doEstranho = await portasDoRdoDePeriodoProtegidas(estranho, obraId, CONJUNTO);

    expect(doEncarregado.ok).toBe(false);
    expect(doEstranho.ok).toBe(false);
    if (doEncarregado.ok || doEstranho.ok) return;
    expect(doEstranho.erro.mensagem).toBe(doEncarregado.erro.mensagem);
  });

  it('não põe nome nem e-mail de pessoa na recusa', async () => {
    const resultado = await portasDoRdoDePeriodoProtegidas(estranho, obraId, CONJUNTO);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).not.toContain(EMAIL_DO_ESTRANHO);
    expect(resultado.erro.mensagem).not.toContain('Pessoa');
  });

  it('recusa a porta de lançamento usada com uma obra diferente da autorizada', async () => {
    const outraObra = await criaObraDoPrd(engenheira, cenario.amb, {
      contrato: 'P0999/99-99 - BLOCO 09',
    });
    const portas = await portasDe(engenheira);

    const lido = await portas.diasDeObra(outraObra, CONJUNTO);

    expect(lido.ok).toBe(false);
  });

  it('recusa a porta de cadastro usada com uma obra diferente da autorizada', async () => {
    const outraObra = await criaObraDoPrd(engenheira, cenario.amb, {
      contrato: 'P0888/88-88 - BLOCO 08',
    });
    const portas = await portasDe(engenheira);

    const lido = await portas.cabecalho(outraObra);

    expect(lido.ok).toBe(false);
  });

  it('recusa o conjunto de dias diferente do que foi lido', async () => {
    const portas = await portasDe(engenheira);

    const lido = await portas.atividadesDosDias(obraId, [D02, D03]);

    expect(lido.ok).toBe(false);
  });
});

describe('o conjunto manda, e o instantâneo é um só', () => {
  it('traz as atividades dos dias pedidos e nenhuma do dia que ficou entre eles', async () => {
    const portas = await portasDe(engenheira);

    const lido = exige<readonly { data: DiaPuro; descricao: string }[]>(
      await portas.atividadesDosDias(obraId, CONJUNTO),
      'atividades do conjunto',
    );

    expect(lido.map((a) => a.descricao)).toEqual([
      'Fresagem da Rua A',
      'Fresagem da Rua C',
    ]);
  });

  it('não devolve registro para o dia do conjunto que ninguém lançou', async () => {
    const portas = await portasDe(engenheira);

    const lido = exige<readonly { dia: DiaPuro }[]>(
      await portas.diasDeObra(obraId, CONJUNTO),
      'dias de obra do conjunto',
    );

    expect(lido.map((d) => d.dia)).toEqual([D02, D05]);
  });

  it('traz a pluviometria e a observação do dia que as tem, e só dele', async () => {
    const portas = await portasDe(engenheira);

    const chuva = exige<readonly { data: DiaPuro; indiceMm: unknown }[]>(
      await portas.pluviometriaDosDias(obraId, CONJUNTO),
      'pluviometria do conjunto',
    );
    const observacoes = exige<readonly { data: DiaPuro; texto: string }[]>(
      await portas.observacoesCrosDosDias(obraId, CONJUNTO),
      'observações do conjunto',
    );

    expect(chuva.map((p) => p.data)).toEqual([D05]);
    expect(observacoes.map((o) => o.data)).toEqual([D05]);
  });

  it('acumula a produção até o último dia, inclusive a do dia fora do conjunto', async () => {
    const portas = await portasDe(engenheira);

    const lido = exige<readonly { data: DiaPuro }[]>(
      await portas.lancamentosDeProducaoAte(obraId, D09),
      'produção acumulada',
    );

    expect(lido.map((p) => p.data)).toEqual([D02, D03]);
  });

  it('devolve os períodos de BMS da obra, para o cabeçalho do consolidado', async () => {
    const portas = await portasDe(engenheira);

    const faixas = exige<readonly { numero: number }[]>(
      await portas.periodosBms(obraId),
      'períodos de BMS',
    );

    expect(faixas.map((f) => f.numero).sort((a, b) => a - b)).toEqual([1, 8]);
  });

  it('entrega o cabeçalho da obra, que não depende de dia nenhum', async () => {
    const portas = await portasDe(engenheira);

    const cabecalho = exige<{ contrato: string }>(
      await portas.cabecalho(obraId),
      'cabeçalho da obra',
    );

    expect(cabecalho.contrato).toBe('P0476/01-25 - BLOCO 02');
  });
});
